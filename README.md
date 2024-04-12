# Lens Guestbook Frame

A Lens Profile guestbook built using [Lens Open Frames standard](https://github.com/defispartan/lens-frames.git)

This frame enables users to share a link and track Lens Profiles that have interacted to sign a guestbook. This frame uses Lens authentication to verify the profiles that interact with the guestbook.

## Demo

- [https://lens-guestbook-frame.vercel.app/](https://lens-guestbook-frame.vercel.app/)

## Setup

- After deploying your repo to Vercel...
- Create a `kv` database `https://vercel.com/<name>/<project>/stores`
- Set the `KV` prefix url's for the new `kv` database
- Navigate to env variables tab in Vercel
- Set the `HOST` env variable to your public facing url or domain, ie; `https://<project>.vercel.app/`
