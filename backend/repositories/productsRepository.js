const { db, admin } = require('../config/firebase');
const { serializeData, setCollectionFromArray } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch(e){}
}

async function getAllProducts() {
  if (!db) return [];
  const snap = await db.collection('products').get();
  const out = snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
  _log('Read', 'products', `count=${out.length}`);
  return out;
}

async function setAllProducts(products) {
  if (String(process.env.ALLOW_BULK_SET || '').toLowerCase() !== 'true') throw new Error('Bulk set disabled. Set ALLOW_BULK_SET=true to enable.');
  if (!db) throw new Error('Firebase not initialized');
  const r = await setCollectionFromArray('products', products);
  _log('WRITE', 'products', `items=${(products || []).length}`);
  return r;
}

async function createProduct(product) {
  if (!db) throw new Error('Firebase not initialized');
  const coll = db.collection('products');
  const id = product.id ? String(product.id) : coll.doc().id;
  const data = Object.assign({}, product, { createdAt: admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() });
  delete data.id;
  await coll.doc(id).set(data);
  const doc = await coll.doc(id).get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Write', 'products', `id=${out.id}`);
  return out;
}

async function updateProduct(id, updates) {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = db.collection('products').doc(String(id));
  await docRef.set(updates, { merge: true });
  const doc = await docRef.get();
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Update', 'products', `id=${out.id}`);
  return out;
}

async function deleteProduct(id) {
  if (!db) throw new Error('Firebase not initialized');
  await db.collection('products').doc(String(id)).delete();
  _log('Delete', 'products', `id=${id}`);
  return true;
}

async function getProductById(id) {
  if (!db) return null;
  const doc = await db.collection('products').doc(String(id)).get();
  if (!doc.exists) return null;
  const out = { id: doc.id, ...serializeData(doc.data()) };
  _log('Read', 'products', `id=${out.id}`);
  return out;
}

module.exports = {
  getAllProducts,
  setAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
};
