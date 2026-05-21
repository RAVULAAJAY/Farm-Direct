require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_STORAGE_BUCKET,
} = process.env;

let firebaseAdmin = null;
let db = null;
let bucket = null;

function hasValidKey(k) {
  return typeof k === 'string' && k.indexOf('-----BEGIN PRIVATE KEY-----') !== -1;
}

function logMissingEnv(context, requiredKeys) {
  const missing = requiredKeys.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    console.warn(`[Startup] Missing ${context} env vars: ${missing.join(', ')}`);
  }
  return missing;
}

logMissingEnv('Firebase', ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']);

try {
  // Prefer env-based credentials when present
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY && hasValidKey(FIREBASE_PRIVATE_KEY)) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey }),
        storageBucket: FIREBASE_STORAGE_BUCKET || undefined,
      });
    }
    firebaseAdmin = admin;
    db = admin.firestore();
    bucket = FIREBASE_STORAGE_BUCKET ? admin.storage().bucket(FIREBASE_STORAGE_BUCKET) : admin.storage().bucket();
    console.log('✅ Firebase connected (env)');
  } else {
    // Fallback to serviceAccountKey.json in this config folder
    const saPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(saPath)) {
      const sa = require(saPath);
      if (sa && hasValidKey(sa.private_key)) {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(sa),
            storageBucket: sa.project_id ? `${sa.project_id}.appspot.com` : undefined,
          });
        }
        firebaseAdmin = admin;
        db = admin.firestore();
        bucket = admin.storage().bucket(sa.project_id ? `${sa.project_id}.appspot.com` : undefined);
        console.log('✅ Firebase connected (serviceAccountKey.json)');
      } else {
        console.error('❌ Firebase connection failed - serviceAccountKey.json is present but invalid (missing private_key)');
      }
    } else {
      console.error('❌ Firebase connection failed - no env credentials and no serviceAccountKey.json found');
    }
  }
} catch (e) {
  console.error('❌ Firebase connection failed', e && e.message ? e.message : e);
}

module.exports = { admin: firebaseAdmin, db, bucket };
