const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllMessages() {
  if (!db) return [];
  const snap = await db.collection('messages').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllMessages(messages) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('messages', messages);
}

async function createMessage(message) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('messages');
  const id = message.id ? String(message.id) : coll.doc().id;
  const data = Object.assign({}, message, { timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function updateMessage(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const ref = db.collection('messages').doc(String(id));
  await ref.set(updates, { merge: true });
  const doc = await ref.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function deleteMessage(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('messages').doc(String(id)).delete();
  return true;
}

module.exports = {
  getAllMessages,
  setAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
};
