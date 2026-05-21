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

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

// Validate required environment variables
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[Firebase] Missing environment variable: ${key}`);
  }
});
const missingEnv = requiredEnvVars.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  const msg = `[Firebase] Missing required env vars: ${missingEnv.join(', ')}`;
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error(msg);
    throw new Error(msg);
  } else {
    console.warn(msg);
  }
}

try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const credentials = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey
      ? {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }
      : require(path.join(__dirname, 'serviceAccountKey.json'));

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${credentials.projectId}.appspot.com`
    });

    console.log('[Firebase] Initialized successfully');
  } else {
    console.log('[Firebase] Already initialized');
  }

  firebaseAdmin = admin;
  db = admin.firestore();
  bucket = admin.storage().bucket();
  console.log('[Firebase] Firestore connected');
  console.log('[Firebase] Storage connected');
} catch (error) {
  console.error(`[Firebase] Initialization error: ${error && error.stack ? error.stack : error}`);
  // In production we must not continue without a working Firebase connection
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw error;
  }
  throw error;
}

module.exports = { admin: firebaseAdmin, db, bucket };
