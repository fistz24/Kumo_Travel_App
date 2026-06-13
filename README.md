# Kumo — your personal travel operating system

Kumo helps you plan trips, organize logistics, track finances, and build a
lifelong archive of travel memories. This is a Vite + React single-page app,
ready to deploy to Vercel, Netlify, or any static host.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Building for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The production build is output to `dist/`.

## Deploying to Vercel

1. Push this folder to a GitHub repository (make sure `package.json`,
   `index.html`, `vite.config.js`, and the `src/` folder are all at the
   repository root, or set Vercel's "Root Directory" to wherever this
   folder lives in your repo).
2. In Vercel, import the repository as a new project.
3. Vercel auto-detects Vite. Confirm these settings if asked:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
4. Deploy. The included `vercel.json` adds an SPA rewrite rule so client-side
   navigation doesn't 404 on refresh.

## Data storage

Kumo stores all your trips, places, expenses, memories, etc. in your
browser's `localStorage` under the key `kumo-data`. This means:

- Your data stays on your device and browser — nothing is sent to a server.
- Clearing your browser data will erase your Kumo archive.
- Use **Settings → Export full archive (JSON)** regularly to back up your
  data, and **Import archive** to restore it (or move it to another device).

## Tech stack

- React 18 + Vite
- [lucide-react](https://lucide.dev/) for icons
- Nunito font (Google Fonts)
- No backend required — fully client-side

## Project structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx     # entry point
    ├── index.css    # global styles
    └── App.jsx      # the entire Kumo app
```
