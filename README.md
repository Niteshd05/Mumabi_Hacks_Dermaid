This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/building-and-running/learn-nextjs).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open `http://localhost:3000` with your browser to see the app.

You can start editing the project by modifying files under `app/` and `lib/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load fonts.

## Deploy on Vercel

The easiest way to deploy this app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=nextjs-repo).

## Environment & Integrations

Create a `.env.local` file with:

```bash
# Required for Gemini 2.0 Flash agentic planning
GOOGLE_API_KEY=your_google_generative_ai_key_here

# Local dev base URL (optional)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Amazon SearchAPI key (for product links)
SEARCHAPI_KEY=your_searchapi_key_here
```

**Weather/UV**

- Uses [Open‑Meteo](https://open-meteo.com/) (no API key required). No extra setup needed.

**Face Age (optional)**

- We use [`@vladmandic/face-api`](https://github.com/vladmandic/face-api) for age estimation during cosmetic scans.
- At runtime the app tries to load models from `/public/models` and falls back to a CDN.
- To bundle models locally (recommended for offline): copy all files from `node_modules/@vladmandic/face-api/model/` into `public/models/` so that files like `public/models/tiny_face_detector_model-weights_manifest.json` and `public/models/age_gender_model-weights_manifest.json` exist.

**Product Links via SearchAPI (optional)**

- The dashboard calls `/api/links` which proxies to `https://www.searchapi.io` to fetch Amazon product URLs based on recommended ingredients.
- Set `SEARCHAPI_KEY` in `.env.local` to enable this feature.

