# ClearPass

CA exam prep, finally done right. Know exactly where you're weak — fix it.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4** + Framer Motion
- **Google Gemini 2.5 Flash** — question generation + weakness analysis
- **Vitest** — unit tests

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your keys (see below)
npm run dev                  # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio key — [get one here](https://aistudio.google.com/app/apikey) |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | Yes | Google Apps Script URL for waitlist (see below) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (`http://localhost:3000` locally) |

## Waitlist Setup (Google Apps Script)

1. Create a Google Sheet with columns: `Timestamp | Email | Phone`
2. Open **Extensions → Apps Script**, paste this and save:

```js
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  const data = JSON.parse(e.postData.contents)
  sheet.appendRow([new Date(), data.email, data.phone])
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
```

3. **Deploy → New deployment** — Web app, Execute as Me, Anyone can access
4. Copy the URL → `NEXT_PUBLIC_APPS_SCRIPT_URL` in `.env.local`

## Routes

| Route | Type | Description |
|---|---|---|
| `/` | Static | Landing page with waitlist |
| `/test` | Dynamic | 22-question CA Intermediate Audit MCQ test |
| `/results` | Static shell | Readiness report + AI study plan |
| `/api/questions` | Serverless | Assembles test from question bank + Gemini |
| `/api/report` | Serverless | Scores answers + generates Gemini report |

## Running Tests

```bash
npm test            # run once
npm run test:watch  # watch mode
```

21 tests covering question bank integrity, scoring logic, and test engine distribution.

## Branches

| Branch | Purpose |
|---|---|
| `main` | Production landing page (Vite SPA → `clearpass.snpventures.in`) |
| `dev` | Product build (Next.js App Router → `clearpass-dev-snp.vercel.app`) |

## Deploying

```bash
vercel                                              # preview deploy
vercel alias <url> clearpass-dev-snp.vercel.app     # point stable alias
```
