"use server";

import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import { Guestbook } from "./types";
import { redirect } from "next/navigation";

export async function saveGuestbook(guestbook: Guestbook, formData: FormData) {
  let newGuestbook = {
    ...guestbook,
    created_at: Date.now(),
    title: formData.get("title") as string,
  };
  await kv.hset(`guestbook:${guestbook.id}`, guestbook);
  await kv.zadd("guestbooks_by_date", {
    score: Number(guestbook.created_at),
    member: newGuestbook.id,
  });

  revalidatePath("/guestbooks");
  redirect(`/guestbooks/${guestbook.id}`);
}

export async function signGuestbook(guestbook: Guestbook, optionIndex: number) {
  await kv.hincrby(`guestbook:${guestbook.id}`, `votes${optionIndex}`, 1);

  revalidatePath(`/guestbooks/${guestbook.id}`);
  redirect(`/guestbooks/${guestbook.id}?results=true`);
}

export async function redirectToGuestbook() {
  redirect("/guestbooks");
}
