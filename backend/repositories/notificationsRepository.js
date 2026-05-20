const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllNotifications(userId) {
  if (!db) return [];
  const coll = db.collection('notifications');
  if (userId) {
    const snap = await coll.where('userId', '==', String(userId)).get();
    return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  }
  const snap = await coll.get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function createNotification(notification) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('notifications');
  const id = notification.id ? String(notification.id) : coll.doc().id;
  const data = Object.assign({}, notification, { timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function updateNotification(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const ref = db.collection('notifications').doc(String(id));
  await ref.set(updates, { merge: true });
  const doc = await ref.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function deleteNotification(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('notifications').doc(String(id)).delete();
  return true;
}

module.exports = {
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
};

// optional batch-set for compatibility with saveData sync
module.exports.setAllNotifications = async function(items) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('notifications', items || []);
};
