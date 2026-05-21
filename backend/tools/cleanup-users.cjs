require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { admin, db } = require('../config/firebase');
const { sanitizeFirestoreData, serializeData } = require('../services/firebaseService');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isBcryptPassword(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

async function main() {
  if (!db) throw new Error('Firestore is not initialized');

  const apply = process.argv.includes('--apply');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...serializeData(doc.data()) }));

  const grouped = new Map();
  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    if (!grouped.has(email)) grouped.set(email, []);
    grouped.get(email).push(user);
  }

  const duplicateGroups = [...grouped.entries()].filter(([, items]) => items.length > 1);
  const legacyUsers = users.filter((user) => {
    const password = typeof user.password === 'string' ? user.password : '';
    return !password.startsWith('$2');
  });

  const report = {
    totalUsers: users.length,
    uniqueEmails: grouped.size,
    duplicateGroups: duplicateGroups.length,
    legacyUsers: legacyUsers.length,
    duplicates: duplicateGroups.map(([email, items]) => ({
      email,
      ids: items.map((item) => item.id),
    })),
  };

  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to inactivate duplicate docs and normalize keeper records.');
    return;
  }

  let inactivatedCount = 0;
  let updatedCount = 0;

  for (const [email, items] of grouped.entries()) {
    const sorted = items.slice().sort((left, right) => {
      const leftUpdatedAt = Date.parse(left.updatedAt || left.createdAt || left.joinedDate || '') || 0;
      const rightUpdatedAt = Date.parse(right.updatedAt || right.createdAt || right.joinedDate || '') || 0;
      return rightUpdatedAt - leftUpdatedAt;
    });

    const keeper = sorted[0];
    const duplicates = sorted.slice(1);

    if (duplicates.length > 0) {
      console.log(`[Cleanup] ${email}: keeping ${keeper.id}, inactivating ${duplicates.map((item) => item.id).join(', ')}`);
      const batch = db.batch();
      for (const duplicate of duplicates) {
        batch.set(db.collection('users').doc(duplicate.id), {
          isActive: false,
          supersededBy: keeper.id,
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        inactivatedCount += 1;
      }
      await batch.commit();
    }

    const password = typeof keeper.password === 'string' ? keeper.password : '';
    const isBcrypt = isBcryptPassword(password);

    if (isBcrypt) {
      const cleaned = sanitizeFirestoreData({
        ...keeper,
        email,
        password,
        passwordHash: admin.firestore.FieldValue.delete(),
        passwordSalt: admin.firestore.FieldValue.delete(),
        hashedPassword: admin.firestore.FieldValue.delete(),
      });

      delete cleaned.passwordHash;
      delete cleaned.passwordSalt;
      delete cleaned.hashedPassword;

      await db.collection('users').doc(keeper.id).set(cleaned, { merge: true });
      updatedCount += 1;
      continue;
    }

    // Legacy scrypt/plaintext records cannot be converted without the original password.
    // Keep the surviving record but preserve it for login migration on the next successful sign-in.
    await db.collection('users').doc(keeper.id).set({
      email,
      isActive: true,
      archivedAt: null,
      supersededBy: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    updatedCount += 1;
  }

  console.log(`[Cleanup] Completed. Inactivated ${inactivatedCount} duplicate docs, updated ${updatedCount} doc(s).`);
}

main().catch((error) => {
  console.error('[Cleanup] Failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});