Auto-fix helper scripts

1) test-smtp.js
- Purpose: verify SMTP credentials and send a test email.
- Usage:
  - Install deps: `npm install nodemailer dotenv`
  - Ensure `farm-direct-api.env` is present in the repo root (or export SMTP_* env vars).
  - Run: `node tools/test-smtp.js`

2) render-update-secret-template.sh
- Purpose: prints a safe `curl` command template to set an environment secret on Render.
- Usage:
  - Set env vars in your shell: `export RENDER_API_KEY=...` `export SERVICE_ID=svc-...` `export NEW_VALUE="your-secret"`
  - Run: `NEW_VALUE="..." SERVICE_ID=svc-... RENDER_API_KEY=... ./tools/render-update-secret-template.sh SMTP_PASS`
  - Verify the printed curl command before running it.

Notes:
- The template prints the API call; it does not run it to avoid accidental secret leaks.
- After updating the secret on Render, redeploy or restart the service.
