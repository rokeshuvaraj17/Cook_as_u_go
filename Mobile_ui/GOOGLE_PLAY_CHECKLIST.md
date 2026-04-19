# Google Play release checklist (Cook As U Go)

The production Android build uses **`https://cook-as-u-go.onrender.com`** as the API base (`EXPO_PUBLIC_API_URL` in `eas.json`). Receipt scanning goes through that backend, which proxies to ScanAndSave (`SCAN_API_URL` on Render).

## One-time: Google Play Console

1. **Developer account** — [play.google.com/console](https://play.google.com/console) ($25 one-time fee).
2. **Create app** — Default language, title **Cook As U Go**, app type (usually **App**), free/paid.
3. **App access** — If any features need login, add test instructions for reviewers (email/password for a demo account on your Render backend).
4. **Ads** — Declare whether the app contains ads (this project: typically **No**).
5. **Content rating** — Complete the questionnaire (IARC).
6. **Target audience** — Age groups; “appeal to children” affects policy.
7. **News app** — Usually **No**.
8. **COVID-19 contact status** — Usually **No** / N/A.
9. **Data safety** — Declare data collected (e.g. account email, pantry/receipt data on **your** server). Link to privacy policy.
10. **Privacy policy URL** — Public HTTPS page describing what you collect, retention, contact. Required for most apps.
11. **Government apps** — Usually **No**.
12. **Financial features** — Usually **No** unless you add payments.
13. **Health** — Declare if you add health/medical claims later.
14. **Store listing** — Short + full description, screenshots (phone, and **7-inch tablet** if required), feature graphic (1024×500), icon (512×512 high-res in listing).
15. **Countries / pricing** — Select distribution.
16. **App content** — Declarations (encryption export: most apps use standard HTTPS TLS).

## Build artifact

- New Play listings must upload an **Android App Bundle (.aab)** — configured in `eas.json` (`production` → `buildType: "app-bundle"`).
- **versionCode** must increase on every upload — `eas.json` uses `"autoIncrement": true` for production; keep `expo.android.versionCode` in `app.json` as the starting baseline.

## Signing

- **EAS** can manage Play signing (`eas credentials`). On first `eas build`, follow prompts to create or use a keystore.
- For **Play App Signing**, Google re-signs the AAB; upload key is separate from the app signing key.

## Expo / EAS commands

```bash
cd Mobile_ui
npm install
npx expo install expo-build-properties
eas login
eas build:configure   # if not already linked
npm run eas:android:production
```

After the build finishes, download the **.aab** from the Expo dashboard (or use the build URL).

## Submit to Play (optional CLI)

```bash
cd Mobile_ui
eas submit --platform android --profile production --latest
```

Requires a **Google Play service account JSON** with API access enabled in Play Console (see Expo “Submit to Google Play” docs). Alternatively, upload the **.aab** manually in Play Console → **Testing** or **Production** → **Create new release**.

## Backend / Render

- Kitchen API must stay reachable at **`https://cook-as-u-go.onrender.com`** (TLS).
- Set **`SCAN_API_URL`** on that Render service to your **ScanAndSave** Render URL so receipt preview works.

## Optional: internal testing first

1. Play Console → **Testing** → **Internal testing** → create track.
2. Upload AAB, add tester emails, publish internal test.
3. Promote to **Closed** / **Open** / **Production** when ready.

## Notes

- **`usesCleartextTraffic`** is **true** in `expo-build-properties` so **Expo Go / LAN dev** over `http://` keeps working. Store builds only talk to **https** Render; you can set it to **false** later if Play review asks and you no longer need cleartext for dev.
- Replace placeholder assets if needed: **adaptive icon**, **feature graphic**, **screenshots** for a polished listing.
