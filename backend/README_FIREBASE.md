Firebase integration notes

This backend was extended to support Firestore + Storage as the primary data store while preserving existing business logic (emails, OTP, Socket.IO, schedulers) in this Render-hosted Node server.

Quick start

1. Install dependencies in `backend`:

```powershell
cd backend
npm install
```

2. Set environment variables (see `.env.example`):
- `USE_FIRESTORE=true`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (escape newlines as `\\n`), `FIREBASE_STORAGE_BUCKET`

3. Ensure `BREVO_API_KEY` and other existing backend env vars are set.

4. Optional: migrate existing local JSON (`backend/data/*.json`) to Firestore using the included migration script:

```powershell
cd backend
node tools/import-to-firestore.js
```

Notes
- This implementation uses a repository pattern (`backend/repositories/*`) and a small storage helper (`backend/services/firebaseService.js`).
- `USE_FIRESTORE=false` will keep legacy JSON file behavior.
- Uploads are stored via `backend/services/firebaseService.uploadBase64` which returns a signed URL.

Security
- Never commit `FIREBASE_PRIVATE_KEY` to source control. Keep it in your Render environment variables.
- Do not store card numbers or raw payment data in Firestore.

If you'd like, I can also:
- Run the import script now (requires your service account env variables), or
- Convert specific endpoints to call repository methods directly instead of relying on the saveData sync.
