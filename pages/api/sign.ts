import type { NextApiRequest, NextApiResponse } from "next";
import { kv } from "@vercel/kv";
import {
  FrameVerifySignatureResult,
  LensClient,
  production,
} from "@lens-protocol/client";

const client = new LensClient({
  environment: production,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const guestbookId = req.query["id"];
      const results = req.query["results"] === "true";
      if (!guestbookId) {
        return res.status(400).send("Missing guestbook ID");
      }

      const untrustedData = req.body.untrustedData;

      try {
        const signedTypedData = await client.frames.createFrameTypedData({
          ...req.body.untrustedData,
        });
        const verified = await client.frames.verifyFrameSignature({
          identityToken: untrustedData.identityToken,
          signature: req.body.trustedData.signature,
          signedTypedData,
        });

        if (verified === FrameVerifySignatureResult.Verified) {
          if (!untrustedData.url.startsWith(process.env["HOST"] || "")) {
            return res
              .status(400)
              .send(`Invalid frame url: ${untrustedData.url}`);
          }
        } else {
          return res.status(400).send(`Invalid frame signature`);
        }
      } catch (e) {
        return res.status(400).send(`Failed to validate message: ${e}`);
      }

      if (results && untrustedData.buttonIndex === 2) {
        return res
          .status(302)
          .setHeader("Location", `${process.env["HOST"]}`)
          .send("Redirecting to create guestbook");
      }

      const hasSigned = await kv.sismember(
        `guestbook:${guestbookId}:signed`,
        untrustedData.profileId
      );

      if (
        untrustedData.buttonIndex > 0 &&
        untrustedData.buttonIndex < 5 &&
        !results &&
        !hasSigned
      ) {
        await kv.sadd(
          `guestbook:${guestbookId}:signed`,
          untrustedData.profileId
        );
      }

      const signed = hasSigned ? "Already Signed" : "Sign Guestbook";
      const button1Text = results ? "View Results" : signed;

      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signed Guestbook</title>
          <meta property="og:title" content="Signed Guestbook">
          <meta name="of:version" content="1.0.0">
          <meta name="of:accepts:lens" content="1.0.0">
          <meta name="of:post_url" content="${
            process.env["HOST"]
          }/api/guestbook?id=${guestbookId}&results=${
        results ? "false" : "true"
      }">
          <meta name="of:button:1" content="${button1Text}">
          <meta name="of:button:2" content="Create your guestbook">
          <meta name="of:button:2:action" content="post_redirect">
        </head>
        <body>
          <p>${
            results || hasSigned
              ? `You have already signed. You clicked ${untrustedData.buttonIndex}`
              : `Signature recorded for profileId ${untrustedData.profileId}.`
          }</p>
        </body>
      </html>
    `);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating image");
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
