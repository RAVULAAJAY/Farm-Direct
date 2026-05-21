const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch(e){}
}

async function getAllMessages() {
  if (!db) return [];
  const snap = await db.collection('messages').get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('Read', 'messages', `count=${out.length}`);
  return out;
}

async function setAllMessages(messages) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const r = await setCollectionFromArray('messages', messages);
  _log('WRITE', 'messages', `items=${(messages || []).length}`);
  return r;
}

async function createMessage(message) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('messages');
  const id = message.id ? String(message.id) : coll.doc().id;
  const data = Object.assign({}, message, { timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Write', 'messages', `id=${out.id}`);
  return out;
}

async function updateMessage(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const ref = db.collection('messages').doc(String(id));
  await ref.set(updates, { merge: true });
  const doc = await ref.get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Update', 'messages', `id=${out.id}`);
  return out;
}

async function deleteMessage(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('messages').doc(String(id)).delete();
  _log('Delete', 'messages', `id=${id}`);
  return true;
}

async function getMessageById(id) {
  if (!db) return null;
  const doc = await db.collection('messages').doc(String(id)).get();
  if (!doc.exists) return null;
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Read', 'messages', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllMessages,
  setAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getMessageById,
};
