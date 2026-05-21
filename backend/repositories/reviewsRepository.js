const { db, admin } = require('../config/firebase');
const { serializeData, sanitizeFirestoreData } = require('../services/firebaseService');

function _log(op, collection, details) {
  try { console.log(`[Firestore] ${String(op).toUpperCase()} - ${collection}${details ? ` (${details})` : ''}`); } catch (e) {}
}

async function addReview(productId, review) {
  if (!db) throw new Error('Firebase not initialized');
  const productRef = db.collection('products').doc(String(productId));
  const reviewsRef = db.collection('reviews');

  const result = await db.runTransaction(async (tx) => {
    const prodSnap = await tx.get(productRef);
    if (!prodSnap.exists) throw new Error('Product not found');

    const prod = prodSnap.data() || {};
    const existingCount = Number(prod.reviews) || (Array.isArray(prod.reviewEntries) ? prod.reviewEntries.length : 0);
    const existingRating = Number(prod.rating) || 0;

    const rating = Number(review.rating) || 0;
    const nextCount = existingCount + 1;
    const nextRating = nextCount > 0 ? ((existingRating * existingCount) + rating) / nextCount : rating;

    const reviewRef = reviewsRef.doc();
    const now = admin ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
    const reviewData = sanitizeFirestoreData({ ...(review || {}), productId: String(productId), createdAt: now });

    tx.set(reviewRef, reviewData);
    tx.update(productRef, {
      rating: Number(nextRating.toFixed(2)),
      reviews: nextCount,
      reviewEntries: admin ? admin.firestore.FieldValue.arrayUnion(reviewData) : (Array.isArray(prod.reviewEntries) ? [...prod.reviewEntries, reviewData] : [reviewData]),
    });

    return { id: reviewRef.id, ...serializeData(reviewData) };
  });

  _log('WRITE', 'reviews', `productId=${productId}`);
  _log('UPDATE', 'products', `productId=${productId} ratings updated`);
  return result;
}

module.exports = {
  addReview,
};
