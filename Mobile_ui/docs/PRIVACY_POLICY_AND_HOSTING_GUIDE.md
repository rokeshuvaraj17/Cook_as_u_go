# Privacy policy & Google Play (Cook As U Go)

This document has two parts:

1. **Hosting guide** — where to put your policy and how to link it in Play Console.  
2. **Privacy policy text** — copy the section below onto a public web page, replace the bracketed placeholders, then publish the URL.

---

## Part 1 — What Google requires

If your app uses **sensitive permissions** (for you: **`CAMERA`** and photo library access via **expo-image-picker**), Play Console requires:

| Requirement | Where in Play Console |
|---------------|------------------------|
| **Privacy policy URL** | **Policy** → **App content** → **Privacy policy** |
| **Data safety form** | **Policy** → **App content** → **Data safety** |

The policy URL must:

- Use **`https://`**
- Load without login for reviewers
- Stay available for the lifetime of the app listing

Your policy must **truthfully** describe what the app does today (camera/photos, account, server storage). Update it when features change.

---

## Part 2 — Where to host the page (pick one)

### Option A — GitHub Pages (free, common for indies)

1. Create a new public repo (e.g. `cook-as-u-go-legal`) or use `username.github.io`.
2. Add a file `privacy.html` or `privacy/index.html` with the policy HTML (or use a Markdown file with a Jekyll/GitHub Pages theme).
3. Enable **Settings** → **Pages** → branch `main` / folder `/ (root)` or `/docs`.
4. Your URL will look like: `https://<username>.github.io/<repo>/privacy.html`  
5. Paste that exact URL into Play Console → **Privacy policy**.

**Pros:** Free, stable URL, version control. **Cons:** Slight setup if you have never used Pages.

### Option B — Google Sites (free, very simple)

1. Go to [sites.google.com](https://sites.google.com), create a site, paste your policy text.
2. **Publish** to the web, set visibility to **Anyone on the internet**.
3. Copy the published **https** link into Play Console.

**Pros:** No code. **Cons:** Less “branded” unless you customize.

### Option C — Notion (public page)

1. Write the policy in a Notion page → **Share** → **Publish to web**.
2. Use the public **https** link in Play Console.

**Pros:** Fast edits. **Cons:** Some teams prefer a domain they fully control; ensure “Share to web” stays on.

### Option D — Your own website

If you already have `https://yourdomain.com`, add `/privacy` or `/privacy-policy` and use that URL.

### Option E — Same host as your API (e.g. Render static site)

If you use Render for the kitchen API, you can add a **static site** service or serve a single route that returns the policy. Ensure the path is stable and uses HTTPS.

---

## Part 3 — Before you publish (checklist)

- [ ] Replace **`[YOUR_CONTACT_EMAIL]`** (and optional **`[YOUR_POSTAL_ADDRESS]`**) in the policy text.
- [ ] Replace **`[POLICY_LAST_UPDATED_DATE]`** (e.g. `April 19, 2026`).
- [ ] Confirm production API host name matches what you ship (below uses **`https://cook-as-u-go.onrender.com`** — change if yours differs).
- [ ] Publish the page and open it in an **incognito** window (no login).
- [ ] Paste URL in Play Console → **App content** → **Privacy policy** → **Save**.
- [ ] Complete **Data safety** so it **matches** this policy (camera, photos, account, server storage).

---

## Part 4 — Privacy policy (copy from “Cook As U Go” through “End of policy”)

*Instructions: Copy everything from the next line through **End of policy** into your website. Use headings and paragraphs as you like. Replace all `[PLACEHOLDERS]`.*

---

**Cook As U Go — Privacy Policy**  
**Last updated:** `[POLICY_LAST_UPDATED_DATE]`

### Who we are

Cook As U Go (“the App”) is operated by **`[YOUR_LEGAL_NAME_OR_COMPANY_NAME]`** (“we”, “us”).  
**Contact:** `[YOUR_CONTACT_EMAIL]`  
**Postal address (optional):** `[YOUR_POSTAL_ADDRESS]`

If you have questions about this policy or your data, email us at the address above.

---

### Summary (plain language)

- The App helps you manage a **kitchen pantry** and optionally **scan grocery receipts** to add items.  
- To do that, we may process **images** you take with the **camera** or choose from your **photo library**, and we process **account** and **pantry** data you provide.  
- Images and related data are sent to **our servers** over HTTPS so we can run receipt recognition and save items you confirm.  
- We do **not** sell your personal information. We use data to run the service you asked for.

---

### What data we collect

**1. Account and authentication**

- **What:** Information you provide to create or use an account (for example **email address** and **password** or tokens used for sign-in).  
- **Why:** To identify you, secure your account, and sync your pantry with your login.  
- **Storage:** Stored on **our backend** (see “Where we process data” below).

**2. Pantry and kitchen data**

- **What:** Items you add or edit in the pantry (names, quantities, units, dates, and similar fields shown in the App).  
- **Why:** To provide the core pantry features.  
- **Storage:** Stored on **our backend**, associated with your account.

**3. Receipt images (camera and photo library)**

- **What:** **Photos of receipts** you capture with the device **camera** or select from your **photo library**. The App may send the image (or a compressed copy) to our servers for **automated reading** of line items (merchant name, dates, totals, product lines where detectable).  
- **Why:** To offer **receipt scanning** so you can preview parsed results and choose to add items to your pantry.  
- **Storage / sharing:**  
  - Images and derived scan results are processed on **our infrastructure** (API servers and related services we operate or contract).  
  - We do **not** sell receipt images to third parties for their marketing.  
  - We may use subprocessors for **hosting** or **machine learning / OCR-style processing** as part of running the service; they process data only as needed to provide the App and under appropriate agreements.

**4. Technical and security data**

- **What:** Standard technical data such as **IP address**, device/app version, timestamps, and error logs when your device talks to our servers.  
- **Why:** Security, abuse prevention, debugging, and reliability.  
- **Storage:** Retained as needed for those purposes and in line with our retention practices.

**5. Local data on your device**

- **What:** The App may store **tokens**, **settings**, or **cached API responses** on your phone (for example via secure storage or local database mechanisms) so you stay logged in and the App works offline where designed.  
- **Why:** App functionality and user experience.  
- **Storage:** On **your device**; you can often clear it by uninstalling the App or using OS/app data controls.

---

### Why we use this data (legal bases where applicable)

Depending on your region, we rely on one or more of:

- **Contract** — to provide the App and features you request.  
- **Legitimate interests** — to secure our systems, fix bugs, and improve reliability (balanced against your rights).  
- **Consent** — where required (for example for certain permissions or marketing, if we add them later).

---

### Whether we “share” or “sell” data

- We **do not sell** your personal information in the sense of selling lists of users to data brokers for money.  
- We **share** data with **service providers** (e.g. cloud hosting, receipt processing) only as needed to operate the App, under confidentiality and security obligations.  
- We may disclose information if **required by law** or to protect rights, safety, and security.

---

### Where we process data

Production services for the App are operated from infrastructure we control or use (for example servers reachable at **`https://cook-as-u-go.onrender.com`** or successor URLs we notify users of). Data may be processed in countries where those servers are located. By using the App, you understand your information may be transferred to and stored in those locations.

---

### How long we keep data

We keep account, pantry, and receipt-related data **as long as your account is active** and for a reasonable period afterward for backups, legal compliance, or dispute resolution, unless a shorter period is required by law. You may request deletion as described below.

---

### Your choices and rights

Depending on where you live, you may have rights to **access**, **correct**, **delete**, or **export** your personal data, or to **object** to certain processing. To exercise these rights, contact **`[YOUR_CONTACT_EMAIL]`**. We may need to verify your identity before fulfilling a request.

You can control **camera** and **photos** permissions through your device **Settings**; denying them may limit receipt scanning features.

---

### Children’s privacy

The App is **not directed at children under 13** (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children. If you believe we have, contact us and we will delete it.

---

### Security

We use **HTTPS** for data in transit and reasonable administrative and technical safeguards. No method of transmission or storage is 100% secure.

---

### Changes to this policy

We may update this policy from time to time. We will post the new version at the same URL (or update the in-app link if we provide one) and change the **“Last updated”** date. Continued use of the App after changes means you accept the updated policy, except where your consent is required for material changes under applicable law.

---

### End of policy

---

## Part 5 — Data safety form (Play Console) — alignment hints

When you fill **Data safety** in Play Console, answer consistently with the policy above. Typical mappings for Cook As U Go:

| Data type | Collected? | Purpose examples | Ephemeral vs stored |
|-----------|------------|------------------|---------------------|
| **Personal info** (email) | Yes | App functionality, account management | Stored on server |
| **Photos / videos** | Yes | App functionality (receipt images) | Processed/stored as you implement |
| **Financial info** (if you declare receipt totals as “purchase history”) | Often “yes” if you store parsed totals | App functionality | Stored if saved with bills |
| **App activity** | Optional | Analytics only if you add analytics SDKs | N/A |

**Permissions:** You declare **Camera** because users can photograph receipts. Declare **Photos / media** if the manifest includes read media / photo picker access.

If you **do not** use advertising SDKs, say you do **not** collect data for **advertising**. If you add analytics later, update both the policy and Data safety.

---

## Part 6 — Optional: minimal HTML wrapper

If you paste into a blank `.html` file for GitHub Pages, you can wrap the text like this (replace body content with your paragraphs):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — Cook As U Go</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>Cook As U Go — Privacy Policy</h1>
  <p><strong>Last updated:</strong> [POLICY_LAST_UPDATED_DATE]</p>
  <!-- Paste the rest of your policy paragraphs here -->
</body>
</html>
```

---

## Disclaimer

This document is **informational** and not legal advice. If you operate in the EU, UK, California, or other regulated regions, consider having a qualified lawyer review your final policy and Data safety answers.
