# LinkedIn Networker — Setup Guide

## Prerequisites

- Google Chrome (or Chromium-based browser)
- A Google account
- An OpenAI account (for scoring + drafts)
- Optionally: a Hunter.io account (for company email lookup)

---

## Step 1 — Google Cloud OAuth Setup

You need a Google OAuth client ID so the extension can write to your Google Sheets.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or use an existing one).
2. **Enable the Sheets API**: APIs & Services → Library → search "Google Sheets API" → Enable.
3. **Create OAuth credentials**:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Chrome Extension**
   - For "Application ID", you'll need your extension ID (see Step 2 below)
4. Copy the **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
5. Open `manifest.json` and replace `YOUR_GOOGLE_CLIENT_ID` with your client ID:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
     ...
   }
   ```

---

## Step 2 — Load the Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top right)
3. Click **Load unpacked** and select this folder (`linkedin-extension/`)
4. The extension will appear — note the **Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
5. Go back to Google Cloud Console and add this ID to your OAuth credential's "Application ID" field

---

## Step 3 — Get Your API Keys

### OpenAI
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Paste it into the extension's Settings page

### Hunter.io (optional — for company email lookup)
1. Go to [hunter.io](https://hunter.io) and create a free account (25 lookups/month free)
2. Go to [hunter.io/api-keys](https://hunter.io/api-keys)
3. Copy your API key and paste it into Settings

---

## Step 4 — Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet
2. Add this header row in row 1:

   | Date | Name | Title | Company | School | Score | Industry Match | Overlap Tags | Mutual | Email | Notes | Profile URL |
   |------|------|-------|---------|--------|-------|---------------|--------------|--------|-------|-------|-------------|

3. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

---

## Step 5 — Configure the Extension

1. Click the extension icon → ⚙ Settings
2. Paste your **OpenAI API key**
3. Paste your **Hunter.io key** (optional)
4. Paste your **Google OAuth Client ID** and **Spreadsheet ID**
5. Click **Save Settings**
6. Click **Connect Google** and sign in
7. Upload your resume PDF (or paste text manually)
8. Click **Save Settings** again

---

## Usage

1. Navigate to any LinkedIn profile (`linkedin.com/in/username`)
2. Click the extension icon
3. The profile is automatically scraped
4. Click **Score** to get your networking score
5. Click **Draft** → choose **LinkedIn** (200-char connection request) or **Email** (longer cold email via Hunter)
6. Add notes, then click **+ Add to Sheet** to log the contact

---

## Troubleshooting

**"Could not scrape profile"** — Refresh the LinkedIn page and try again. LinkedIn's DOM can take a moment to fully render.

**"Google sign-in failed"** — Make sure your Extension ID in Google Cloud matches the one in `chrome://extensions`. Also ensure the Sheets API is enabled in your project.

**Score is blank** — Check that your OpenAI key is valid and has credit. The extension uses `gpt-5.4-mini` which is very cheap (~$0.001 per score).

**Hunter lookup returns nothing** — Hunter doesn't have every company in its database. The free tier also caps at 25/month.
