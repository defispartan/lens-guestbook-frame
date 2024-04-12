import { kv } from "@vercel/kv";
import { Guestbook } from "@/app/types";
import { GuestbookSignForm } from "@/app/form";
import Head from "next/head";
import { Metadata, ResolvingMetadata } from "next";

async function getGuestbook(id: string): Promise<Guestbook> {
  let nullGuestbook = {
    id: "",
    title: "No guestbook found",
    created_at: 0,
  };

  try {
    let guestbook: Guestbook | null = await kv.hgetall(`guestbook:${id}`);

    if (!guestbook) {
      return nullGuestbook;
    }

    return guestbook;
  } catch (error) {
    console.error(error);
    return nullGuestbook;
  }
}

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const id = params.id;
  const guestbook = await getGuestbook(id);

  const frameMetadata: Record<string, string> = {
    "of:accepts:lens": "1.0.0",
    "of:post_url": `${process.env["HOST"]}/api/vote?id=${id}`,
    "of:image": `${process.env["HOST"]}/api/image?id=${id}`,
    "of:button:1": "Sign Guestbook",
  };

  return {
    title: guestbook.title,
    openGraph: {
      title: guestbook.title,
      images: [`/api/image?id=${id}`],
    },
    other: {
      ...frameMetadata,
    },
    metadataBase: new URL(process.env["HOST"] || ""),
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const guestbook = await getGuestbook(params.id);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <main className="flex flex-col items-center justify-center flex-1 px-4 sm:px-20 text-center">
          <GuestbookSignForm guestbook={guestbook} />
        </main>
      </div>
    </>
  );
}
