const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

async function getAllProducts() {
  if (!db) return [];
  const snap = await db.collection('products').get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setAllProducts(products) {
  if (!db) throw new Error('Firebase not initialized');
  return setCollectionFromArray('products', products);
}

async function createProduct(product) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('products');
  const id = product.id ? String(product.id) : coll.doc().id;
  const data = Object.assign({}, product, { createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function updateProduct(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = db.collection('products').doc(String(id));
  await docRef.set(updates, { merge: true });
  const doc = await docRef.get();
  return { id: doc.id, ...serializeData(doc.data()) };
}

async function deleteProduct(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('products').doc(String(id)).delete();
  return true;
}

module.exports = {
  getAllProducts,
  setAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
