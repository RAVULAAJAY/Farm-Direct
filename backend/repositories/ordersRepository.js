const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllOrders() {
  if (!db) return [];
  const snap = await db.collection('orders').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllOrders(orders) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('orders', orders);
}

async function createOrder(order) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('orders');
  const id = order.id ? String(order.id) : coll.doc().id;
  const data = Object.assign({}, order, { createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function updateOrder(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = db.collection('orders').doc(String(id));
  await docRef.set(updates, { merge: true });
  const doc = await docRef.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function getOrderById(id) {
  if (!db) return null;
  const doc = await db.collection('orders').doc(String(id)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...serializeData(doc.data()) };
}

module.exports = {
  getAllOrders,
  setAllOrders,
  createOrder,
  updateOrder,
  getOrderById,
};
