const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray, listCollection, sanitizeFirestoreData } = require('../services/firebaseService');
const bcrypt = require('bcrypt');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch(e){}
}

function getSortTimestamp(user) {
  const candidates = [user?.updatedAt, user?.createdAt, user?.joinedDate];
  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

async function getAllUsers() {
  if (!db) return [];
  const snap = await db.collection('users').get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('Read', 'users', `count=${out.length}`);
  return out;
}

async function setAllUsers(users) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const r = await setCollectionFromArray('users', users);
  _log('WRITE', 'users', `items=${(users || []).length}`);
  return r;
}

async function createUser(user) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('users');
  const id = user.id ? String(user.id) : coll.doc().id;
  const data = sanitizeFirestoreData({ ...(user || {}) });
  data.email = normalizeEmail(data.email);
  delete data.id;
  delete data.hashedPassword;
  delete data.passwordHash;
  delete data.passwordSalt;

  if (data.password) {
    try {
      data.password = await bcrypt.hash(data.password, 10);
    } catch (error) {
      console.error('[Auth] Password hashing failed:', error.message);
      throw new Error('Failed to hash password');
    }
  }

  try {
    await coll.doc(id).set(data);
    const doc = await coll.doc(id).get();
    const out = { id: doc.id, ...serializeData(doc.data()) };
    _log('Write', 'users', `id=${out.id}`);
    return out;
  } catch (error) {
    console.error('[Firestore] ERROR - users/createUser', error && error.message ? error.message : error);
    throw error;
  }
}

async function updateUser(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const nextUpdates = sanitizeFirestoreData({ ...(updates || {}) });
  if (Object.prototype.hasOwnProperty.call(nextUpdates, 'email')) {
    nextUpdates.email = normalizeEmail(nextUpdates.email);
  }
  const authCleanupFields = ['hashedPassword', 'passwordHash', 'passwordSalt', 'resetPasswordHash', 'resetPasswordExpiry'];
  for (const field of authCleanupFields) {
    if (nextUpdates[field] === null) {
      nextUpdates[field] = admin.firestore.FieldValue.delete();
    }
  }
  const docRef = db.collection('users').doc(String(id));
  try {
    await docRef.set(nextUpdates, { merge: true });
    const doc = await docRef.get();
    const out = { id: doc.id, ...serializeData(doc.data()) };
    _log('Update', 'users', `id=${out.id}`);
    return out;
  } catch (error) {
    console.error('[Firestore] ERROR - users/updateUser', error && error.message ? error.message : error);
    throw error;
  }
}

async function findByEmail(email) {
  if (!db) return null;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const snap = await db.collection('users').where('email', '==', normalizedEmail).get();
  if (snap.empty) return null;

  const candidates = snap.docs.map((doc) => ({ id: doc.id, ...serializeData(doc.data()) }));
  const preferred = candidates
    .slice()
    .sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left))
    .find((candidate) => {
      const hasBcryptPassword = typeof candidate.password === 'string' && candidate.password.startsWith('$2');
      const hasPlainPassword = typeof candidate.password === 'string' && candidate.password.length > 0 && !candidate.password.startsWith('$2');
      const hasLegacyScrypt = typeof candidate.passwordHash === 'string' && typeof candidate.passwordSalt === 'string';
      return hasBcryptPassword || hasPlainPassword || hasLegacyScrypt;
    }) || candidates.slice().sort((left, right) => getSortTimestamp(right) - getSortTimestamp(left))[0];

  if (candidates.length > 1) {
    console.warn(`[Firestore] Duplicate email records found for ${normalizedEmail}: ${candidates.length}. Using ${preferred.id}`);
  }

  _log('Read', 'users', `findByEmail=${normalizedEmail}`);
  return preferred;
}

async function getUserById(id) {
  if (!db) return null;
  const doc = await db.collection('users').doc(String(id)).get();
  if (!doc.exists) return null;
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Read', 'users', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllUsers,
  setAllUsers,
  createUser,
  updateUser,
  findByEmail,
  getUserById,
};
