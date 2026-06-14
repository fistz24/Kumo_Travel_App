# Kumo — your personal travel operating system

Kumo helps you plan trips, organize logistics, track finances, and build a
lifelong archive of travel memories. This is a Vite + React single-page app,
ready to deploy to Vercel, Netlify, or any static host.

## Features

- **Trips, itinerary, places, stays, transport, routes** — plan every part of a trip
- **Finances** — budgets, planned vs. actual spend, category breakdowns, CSV/JSON export
- **Memories & journal** — photo memories with reflection prompts, auto-generated trip journal
- **Passport & achievements** — country/city stamps and travel milestones
- **Smart Excel/CSV import** — open a trip and use **Import from Excel** to bring in an
  existing itinerary spreadsheet. Kumo scans each sheet, guesses whether it's an
  itinerary, places, hotels, transport, or expenses, and suggests a column mapping
  for you to review and adjust before anything is imported. No data ever leaves
  your browser for this — it's all done locally.
- **Optional AI-assisted mapping** — for trickier spreadsheets, add your own
  Anthropic API key in **Settings** to let Claude refine the column mapping
  suggestions during import. This is entirely optional; the built-in offline
  mapping works without any key.
- **8 pastel themes**, Nunito typeface, mobile-friendly layout with no pinch/double-tap zoom

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

## Importing an existing itinerary spreadsheet

1. Open a trip and click **Import from Excel** on its dashboard.
2. Upload your `.xlsx`, `.xls`, or `.csv` file.
3. For each sheet, Kumo suggests whether it looks like an itinerary, places,
   stays, transport, or expenses, and maps likely columns (e.g. "Check-in
   Date" → Check-in). Adjust the type or any column mapping using the
   dropdowns.
4. (Optional) If you've added an Anthropic API key in Settings, click
   **Enhance with AI** to let Claude refine the suggested mapping —
   especially useful for spreadsheets with unusual or non-English headers.
5. Click **Import**. New itinerary days merge with any existing days on the
   same date; everything else is added as new entries you can edit afterward.

## AI-assisted import & your API key

The AI-assisted mapping feature is entirely optional. If you add an
Anthropic API key in Settings:

- It's stored only in your browser's `localStorage`.
- When you click **Enhance with AI** during import, your spreadsheet's
  column headers and a few sample rows are sent directly from your browser
  to `api.anthropic.com` — never through any Kumo server (there isn't one).
- Leave the key blank to use only the built-in, offline heuristic mapping.

## Tech stack

- React 18 + Vite
- [lucide-react](https://lucide.dev/) for icons
- [SheetJS (xlsx)](https://sheetjs.com/) for reading Excel/CSV files
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
    ├── main.jsx               # entry point
    ├── index.css               # global styles, no-zoom mobile rules
    ├── App.jsx                  # pages & main app shell
    ├── lib/
    │   ├── constants.js         # shared constants (themes, currencies, etc.)
    │   ├── utils.js              # formatting/date helpers + demo data
    │   ├── useKumoData.js        # localStorage-backed data hook
    │   └── excelImport.js        # spreadsheet parsing & mapping heuristics
    └── components/
        ├── ui.jsx                # shared UI primitives (Card, Btn, Modal, ...)
        └── ImportWizard.jsx       # Excel/CSV import flow
```

