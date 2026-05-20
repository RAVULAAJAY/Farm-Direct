const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllActivityLogs() {
  if (!db) return [];
  const snap = await db.collection('activityLogs').orderBy('timestamp', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllActivityLogs(items) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('activityLogs', items);
}

async function addActivityLog(log) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('activityLogs');
  const id = log.id ? String(log.id) : coll.doc().id;
  const data = Object.assign({}, log, { timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

module.exports = {
  getAllActivityLogs,
  setAllActivityLogs,
  addActivityLog,
};
