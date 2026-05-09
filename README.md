# Hue 🎨

A daily color-match puzzle. One new color every day. 30 seconds. Three sliders. How close can you get?

## What it is

- Everyone in the world sees the same color on the same day (deterministic by date).
- Match it using R, G, B sliders within a 30-second window.
- Track your streak, best accuracy, and rank vs. the global average.
- Share your result Wordle-style.

Hue is a fully offline PWA. No accounts, no backend, no analytics. All stats live on your device.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview   # to test the production build
```

The build output lives in `dist/`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo at https://vercel.com/new.
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy.

That's it — Vercel auto-detects Vite. No env vars needed.

## Pages

- `/` — the game
- `/privacy` — privacy policy (we collect nothing)
- `/about` — one paragraph

## Tech

Vanilla JS + Vite. No framework, no runtime deps. ~zero-dep PWA with a hand-rolled service worker for offline play.

## License

MIT — see [LICENSE](./LICENSE).
