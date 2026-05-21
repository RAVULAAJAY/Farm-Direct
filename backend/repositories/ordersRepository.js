const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray, sanitizeFirestoreData } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch (e) {}
}

async function getAllOrders() {
  if (!db) return [];
  const snap = await db.collection('orders').get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('READ', 'orders', `count=${out.length}`);
  return out;
}

async function setAllOrders(orders) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const res = await setCollectionFromArray('orders', orders);
  _log('WRITE', 'orders', `bulk=${Array.isArray(orders) ? orders.length : 'unknown'}`);
  return res;
}

async function createOrder(order) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('orders');
  const id = order.id ? String(order.id) : coll.doc().id;
  const data = sanitizeFirestoreData({ ...(order || {}), createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('WRITE', 'orders', `id=${out.id}`);
  return out;
}

async function updateOrder(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = db.collection('orders').doc(String(id));
  await docRef.set(sanitizeFirestoreData({ ...(updates || {}) }), { merge: true });
  const doc = await docRef.get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('UPDATE', 'orders', `id=${out.id}`);
  return out;
}

async function getOrderById(id) {
  if (!db) return null;
  const doc = await db.collection('orders').doc(String(id)).get();
  if (!doc.exists) return null;
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('READ', 'orders', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllOrders,
  setAllOrders,
  createOrder,
  updateOrder,
  getOrderById,
};
