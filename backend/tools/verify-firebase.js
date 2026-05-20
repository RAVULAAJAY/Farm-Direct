// Simple verification script: loads backend/.env and tries to init firebase-admin
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { admin, db, bucket } = require('../config/firebase');

if (admin && admin.apps && admin.apps.length) {
	console.log('✅ Firebase connected');
	console.log('firebase-admin app count:', admin.apps.length);
	console.log('firestore available:', !!db);
	console.log('storage bucket available:', !!bucket);
	process.exitCode = 0;
} else {
	console.error('❌ Firebase connection failed');
	console.log('firestore available:', !!db);
	console.log('storage bucket available:', !!bucket);
	process.exitCode = 2;
}
