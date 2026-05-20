const { admin, db, bucket } = require('../config/firebase');

function _isTimestamp(v) {
  return v && typeof v.toDate === 'function';
}

function serializeData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(serializeData);
  if (typeof obj !== 'object') return obj;

  const out = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (_isTimestamp(val)) {
      try {
        out[key] = val.toDate().toISOString();
      } catch {
        out[key] = val;
      }
    } else if (Array.isArray(val)) {
      out[key] = val.map(serializeData);
    } else if (val && typeof val === 'object') {
      out[key] = serializeData(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

async function listCollection(collectionName) {
  if (!db) return [];
  const snap = await db.collection(collectionName).get();
  return snap.docs.map(d => ({ id: d.id, ...serializeData(d.data()) }));
}

async function setCollectionFromArray(collectionName, items) {
  if (!db) throw new Error('Firebase not initialized');
  const collRef = db.collection(collectionName);
  const existingSnap = await collRef.get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));

  const batch = db.batch();
  const newIds = new Set();

  for (const item of items) {
    const id = item && item.id ? String(item.id) : collRef.doc().id;
    newIds.add(id);
    const docRef = collRef.doc(String(id));
    const data = Object.assign({}, item);
    delete data.id;
    batch.set(docRef, data);
  }

  // delete docs that are not present anymore
  for (const doc of existingSnap.docs) {
    if (!newIds.has(doc.id)) batch.delete(doc.ref);
  }

  await batch.commit();
  return true;
}

async function uploadBase64(folder, filename, base64, contentType = 'application/octet-stream') {
  if (!bucket) throw new Error('Firebase storage not initialized');
  // accept either data URL or raw base64
  const dataUrlMatch = typeof base64 === 'string' && base64.match(/^data:(.+);base64,(.+)$/);
  let buffer;
  let type = contentType;
  if (dataUrlMatch) {
    type = dataUrlMatch[1] || contentType;
    buffer = Buffer.from(dataUrlMatch[2], 'base64');
  } else if (typeof base64 === 'string') {
    buffer = Buffer.from(base64, 'base64');
  } else if (Buffer.isBuffer(base64)) {
    buffer = base64;
  } else {
    throw new Error('Invalid base64 data');
  }

  const dest = `${folder.replace(/\/+$/, '')}/${Date.now()}_${filename}`;
  const file = bucket.file(dest);

  await file.save(buffer, {
    metadata: { contentType: type },
    resumable: false,
  });

  // Generate a long-lived signed URL (1 year)
  const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + ONE_YEAR });
  return { path: dest, url };
}

async function deleteFile(path) {
  if (!bucket) return false;
  const file = bucket.file(path);
  try {
    await file.delete({ ignoreNotFound: true });
    return true;
  } catch (e) {
    console.warn('[firebaseService] deleteFile failed', e && e.message ? e.message : e);
    return false;
  }
}

module.exports = {
  serializeData,
  listCollection,
  setCollectionFromArray,
  uploadBase64,
  deleteFile,
  db,
  bucket,
};
