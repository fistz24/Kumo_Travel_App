# Kumo on iOS (Capacitor wrapper)

Wrap the existing web app in a native iOS shell so it installs from the App Store / TestFlight and feels like a real app (home screen icon, no Safari chrome, splash screen).

## Requirements (Apple only)

- A **Mac** with **Xcode** (latest from the App Store)
- An **Apple Developer** account (free for device testing; paid $99/year for App Store / TestFlight)
- Node.js 20+

## One-time setup

```bash
# 1. Install dependencies (includes Capacitor)
npm install

# 2. Build the web app into /dist
npm run build

# 3. Add the iOS project (creates the /ios folder)
npx cap add ios

# 4. Copy web build into the iOS app + install native plugins
npx cap sync ios
```

## Open in Xcode and run

```bash
npx cap open ios
```

In Xcode:

1. Select the **Kumo** target → **Signing & Capabilities**
2. Choose your Team (Apple ID)
3. Set a unique Bundle ID if needed (default: `app.kumo.travel`)
4. Plug in an iPhone or pick a Simulator
5. Press **Run** (▶)

## Every time you change the web UI

```bash
npm run build
npx cap sync ios
# then Run again in Xcode (or Cmd+R)
```

Or use the shortcut:

```bash
npm run cap:sync
```

## App icons & splash

- App icon: Xcode → `Assets.xcassets` → `AppIcon` (or use [capacitor-assets](https://github.com/ionic-team/capacitor-assets))
- Splash is configured in `capacitor.config.json` (background `#F3EEE6`)

## Firebase Auth on iOS

Email/password already works inside the WebView.

If you later add Google again, you must configure the iOS URL scheme in Xcode and Firebase Console → Project settings → Your apps → iOS.

## Distribute

| Goal | How |
|------|-----|
| Test on your phone | Xcode → Run with your Apple ID |
| Share with testers | Archive → Upload → **TestFlight** |
| Public | Archive → Submit for **App Store** review |

## Android later

```bash
npx cap add android
npx cap sync android
npx cap open android   # needs Android Studio
```
