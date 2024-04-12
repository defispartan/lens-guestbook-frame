import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { kv } from "@vercel/kv";
import satori from "satori";
import { join } from "path";
import * as fs from "fs";
import { Guestbook } from "@/app/types";

const fontPath = join(process.cwd(), "Roboto-Regular.ttf");
let fontData = fs.readFileSync(fontPath);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const guestbookId = req.query["id"];
    if (!guestbookId) {
      return res.status(400).send("Missing guestbook ID");
    }

    let guestbook: Guestbook | null = await kv.hgetall(
      `guestbook:${guestbookId}`
    );

    if (!guestbook) {
      return res.status(400).send("Missing guestbook ID");
    }

    const showResults = req.query["results"] === "true";
    const signedUsers = await kv.smembers(`guestbook:${guestbookId}:signed`);

    const profilesQuery = `
      query GuestbookProfiles($request: ProfilesRequest!) {
        result: profiles(request: $request) {
            items{
              handle{
                localName
              }
              stats{
                followers
              }
            }
        }
      }
    `;

    const profilesVariables = {
      request: {
        where: {
          profileIds: signedUsers,
        },
      },
    };

    const profilesOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: profilesQuery,
        variables: profilesVariables,
      }),
    };

    const profilesResponse = await fetch(
      "https://api-v2.lens.dev",
      profilesOptions
    );
    const profilesData = await profilesResponse.json();
    const sortedSigners = profilesData.result.profiles.items
      .map(
        (profile: {
          handle: { localName: string };
          stats: { followers: number };
        }) => ({
          name: profile.handle.localName,
          followers: profile.stats.followers,
        })
      )
      .sort(
        (a: { followers: number }, b: { followers: number }) =>
          b.followers - a.followers
      );

    const svg = await satori(
      <div
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "f4f4f4",
          padding: 50,
          lineHeight: 1.2,
          fontSize: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 20,
          }}
        >
          <h2 style={{ textAlign: "center", color: "lightgray" }}>
            {guestbook.title}
          </h2>
          {showResults && (
            <h3 style={{ color: "darkgray" }}>
              Total Signatures: {signedUsers.length}
            </h3>
          )}
          {showResults &&
            sortedSigners.map(
              (signer: { name: string; followers: number }, index: number) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#007bff",
                    color: "#fff",
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 4,
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "visible",
                  }}
                >
                  {index + 1}. {signer.name} - {signer.followers} followers
                </div>
              )
            )}
        </div>
      </div>,
      {
        width: 600,
        height: 400,
        fonts: [
          {
            data: fontData,
            name: "Roboto",
            style: "normal",
            weight: 400,
          },
        ],
      }
    );

    const pngBuffer = await sharp(Buffer.from(svg)).toFormat("png").toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "max-age=10");
    res.send(pngBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
}
