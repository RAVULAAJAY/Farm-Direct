const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray, sanitizeFirestoreData } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch(e){}
}

async function getAllNotifications(userId) {
  if (!db) return [];
  const coll = db.collection('notifications');
  if (userId) {
    const snap = await coll.where('userId', '==', String(userId)).get();
    const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
    _log('Read', 'notifications', `user=${userId} count=${out.length}`);
    return out;
  }
  const snap = await coll.get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('Read', 'notifications', `count=${out.length}`);
  return out;
}

async function createNotification(notification) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('notifications');
  const id = notification.id ? String(notification.id) : coll.doc().id;
  const data = sanitizeFirestoreData({ ...(notification || {}), timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Write', 'notifications', `id=${out.id}`);
  return out;
}

async function updateNotification(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const ref = db.collection('notifications').doc(String(id));
  await ref.set(sanitizeFirestoreData({ ...(updates || {}) }), { merge: true });
  const doc = await ref.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function deleteNotification(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('notifications').doc(String(id)).delete();
  _log('Delete', 'notifications', `id=${id}`);
  return true;
}

async function getNotificationById(id) {
  if (!db) return null;
  const doc = await db.collection('notifications').doc(String(id)).get();
  if (!doc.exists) return null;
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Read', 'notifications', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  getNotificationById,
  setAllNotifications: async function(items) {
    if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
    if (!db) throw new Error('Firebase not initialized');
    const r = await setCollectionFromArray('notifications', items || []);
    _log('WRITE', 'notifications', `items=${(items || []).length}`);
    return r;
  }
};
