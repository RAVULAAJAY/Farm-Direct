const { db } = require('../config/firebase');
const { serializeData, setCollectionFromArray, listCollection } = require('../services/firebaseService');

async function getAllUsers() {
  if (!db) return [];
  const snap = await db.collection('users').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllUsers(users) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('users', users);
}

async function createUser(user) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('users');
  const id = user.id ? String(user.id) : coll.doc().id;
  const data = Object.assign({}, user);
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function updateUser(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = db.collection('users').doc(String(id));
  await docRef.set(updates, { merge: true });
  const doc = await docRef.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function findByEmail(email) {
  if (!db) return null;
  const snap = await db.collection('users').where('email', '==', String(email).trim().toLowerCase()).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...serializeData(d.data()) };
}

module.exports = {
  getAllUsers,
  setAllUsers,
  createUser,
  updateUser,
  findByEmail,
};
