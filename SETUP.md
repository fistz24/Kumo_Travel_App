# 📁 Kumo Travel — Complete File Setup Guide

## What Files You Have & Where Each One Goes

You should have downloaded these files. Here is the exact folder structure you need to create on your Mac:

```
kumo-travel/               ← your project folder (on Desktop)
│
├── index.html             ← put this here
├── package.json           ← put this here
├── vite.config.js         ← put this here
├── vercel.json            ← put this here (FIXES the 404 error!)
├── .gitignore             ← put this here
│
├── public/
│   └── favicon.svg        ← put this here
│
└── src/
    ├── App.jsx            ← this is the main app (rename kumo-travel.jsx → App.jsx)
    ├── main.jsx           ← put this here
    └── index.css          ← put this here
```

---

## Step-by-Step: Fresh Setup from Scratch

### 1. Create the project folder

Open Terminal and run:
```
mkdir -p ~/Desktop/kumo-travel/src
mkdir -p ~/Desktop/kumo-travel/public
```

### 2. Place all the files

Move or copy each downloaded file to the correct location:

| File you downloaded | Goes to |
|---|---|
| `index.html` | `kumo-travel/index.html` |
| `package.json` | `kumo-travel/package.json` |
| `vite.config.js` | `kumo-travel/vite.config.js` |
| `vercel.json` | `kumo-travel/vercel.json` |
| `.gitignore` | `kumo-travel/.gitignore` |
| `favicon.svg` | `kumo-travel/public/favicon.svg` |
| `main.jsx` | `kumo-travel/src/main.jsx` |
| `index.css` | `kumo-travel/src/index.css` |
| `kumo-travel.jsx` | `kumo-travel/src/App.jsx` ← rename it! |

> ⚠️ The app file MUST be named `App.jsx` inside the `src` folder. Not `kumo-travel.jsx`.

### 3. Install dependencies

In Terminal:
```
cd ~/Desktop/kumo-travel
npm install
```

Wait for it to finish (about 30–60 seconds). A `node_modules` folder will appear — that's normal.

### 4. Run locally to test

```
npm run dev
```

Open `http://localhost:5173` in your browser. The app should load. ✅

---

## Deploying to Vercel (Fixes the 404)

The `vercel.json` file included here is what fixes the 404 error. You need to push it to GitHub.

### If you already have it on GitHub and just need to add the missing files:

```
cd ~/Desktop/kumo-travel
git add .
git commit -m "Add all project files + fix vercel.json"
git push
```

Vercel will auto-redeploy within ~30 seconds. Your URL will work. ✅

### If you haven't set up GitHub yet:

1. Go to https://github.com/new → create a repo called `kumo-travel` (Private)
2. In Terminal:
```
cd ~/Desktop/kumo-travel
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/kumo-travel.git
git push -u origin main
```
3. Go to https://vercel.com → Add New Project → Import from GitHub → Deploy

---

## Vercel Dashboard Settings (if still broken)

Go to your project on Vercel → Settings → General → Build & Development Settings:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `.` (leave blank / dot) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Save → go to Deployments tab → Redeploy.
