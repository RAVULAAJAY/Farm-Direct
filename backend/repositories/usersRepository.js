const { db } = require('../config/firebase');
const { serializeData, setCollectionFromArray, listCollection } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch(e){}
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
  const data = Object.assign({}, user);
  if (typeof data.email === 'string') {
    data.email = data.email.trim().toLowerCase();
  }
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Write', 'users', `id=${out.id}`);
  return out;
}

async function updateUser(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const nextUpdates = { ...updates };
  if (typeof nextUpdates.email === 'string') {
    nextUpdates.email = nextUpdates.email.trim().toLowerCase();
  }
  const docRef = db.collection('users').doc(String(id));
  await docRef.set(nextUpdates, { merge: true });
  const doc = await docRef.get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Update', 'users', `id=${out.id}`);
  return out;
}

async function findByEmail(email) {
  if (!db) return null;
  const snap = await db.collection('users').where('email', '==', String(email).trim().toLowerCase()).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  const out = { id: d.id, ...serializeData(d.data()) };
  _log('Read', 'users', `findByEmail=${email}`);
  return out;
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
