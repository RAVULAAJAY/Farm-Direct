require('dotenv').config();
const admin = require('firebase-admin');

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        storageBucket: storageBucket,
      });
      console.log('[firebase-admin] initialized from environment variables');
    } catch (err) {
      console.error('[firebase-admin] init error:', err && err.message ? err.message : err);
    }
  } else {
    try {
      const sa = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        storageBucket: sa.project_id ? `${sa.project_id}.appspot.com` : undefined,
      });
      console.log('[firebase-admin] initialized from serviceAccountKey.json');
    } catch (err) {
      console.warn('[firebase-admin] no credentials found; admin not initialized');
    }
  }

  return admin;
}

initFirebaseAdmin();

const db = admin.apps && admin.apps.length ? admin.firestore() : null;
const bucket = admin.apps && admin.apps.length ? admin.storage().bucket() : null;

module.exports = { admin, db, bucket };
