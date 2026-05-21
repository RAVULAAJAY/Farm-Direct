const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch (e) {}
}

async function getAllActivityLogs() {
  if (!db) return [];
  const snap = await db.collection('activityLogs').orderBy('timestamp', 'desc').get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('READ', 'activityLogs', `count=${out.length}`);
  return out;
}

async function setAllActivityLogs(items) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const res = await setCollectionFromArray('activityLogs', items);
  _log('WRITE', 'activityLogs', `bulk=${Array.isArray(items) ? items.length : 'unknown'}`);
  return res;
}

async function addActivityLog(log) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('activityLogs');
  const id = log.id ? String(log.id) : coll.doc().id;
  const data = Object.assign({}, log, { timestamp: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('WRITE', 'activityLogs', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllActivityLogs,
  setAllActivityLogs,
  addActivityLog,
};
