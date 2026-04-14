# Google Calendar Auto-Creation — Environment Variables

The booking wizard automatically creates a Google Calendar event when a customer submits an appointment request. This requires a **Google Cloud service account** with access to the target calendar.

## Required Environment Variables

Add these in **Netlify → Site Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The service account email (e.g. `my-service@my-project.iam.gserviceaccount.com`) |
| `GOOGLE_PRIVATE_KEY` | The full PEM private key from the service account JSON file (starts with `-----BEGIN PRIVATE KEY-----`) |
| `GOOGLE_CALENDAR_ID` | The calendar to add events to — typically your Gmail address (e.g. `someone@gmail.com`) |

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API** under **APIs & Services → Library**

### 2. Create a Service Account

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Give it a name (e.g. `calendar-bot`) and click through to finish
4. On the service account detail page, go to the **Keys** tab
5. Click **Add Key → Create New Key → JSON**
6. A `.json` file will download — this contains the values you need:
   - `client_email` → use as `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → use as `GOOGLE_PRIVATE_KEY`

### 3. Share Your Calendar with the Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the target calendar in the left sidebar → click the three dots → **Settings and sharing**
3. Under **Share with specific people**, click **Add people**
4. Paste the service account email (`client_email` from the JSON)
5. Set permission to **Make changes to events**
6. Click **Send**

### 4. Get the Calendar ID

- For your primary calendar: the ID is your Gmail address (e.g. `someone@gmail.com`)
- For other calendars: go to **Settings → Settings for my calendars → [Calendar Name] → Integrate calendar** to find the Calendar ID

Use this as the `GOOGLE_CALENDAR_ID` value.

## Notes

- The `GOOGLE_PRIVATE_KEY` includes literal `\n` characters in the JSON file. Paste the full value as-is into Netlify — the server function handles the newline conversion.
- These variables are only used server-side in Netlify Functions. They are never exposed to the browser.
