const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllOtps() {
  if (!db) return [];
  const snap = await db.collection('otps').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllOtps(items) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('otps', items);
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
