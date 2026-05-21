const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllOtps() {
  if (!db) return [];
  const snap = await db.collection('otps').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllOtps(items) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const r = await setCollectionFromArray('otps', items);
  return r;
}

async function addOtp(item) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('otps');
  const id = item.id ? String(item.id) : coll.doc().id;
  const data = Object.assign({}, item);
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

module.exports = {
  getAllOtps,
  setAllOtps,
  addOtp,
};
