# ClearPass

Landing page for ClearPass — CA prep, finally done right.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Waitlist Setup (Google Sheets)

1. Create a new Google Sheet with columns: `Timestamp | Email | Phone`
2. Open **Extensions → Apps Script** in that sheet
3. Paste the following code and save:

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

4. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL
6. Create a `.env` file at the project root:

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

7. Restart `npm run dev` — the waitlist form is now live

## Build

```bash
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```
