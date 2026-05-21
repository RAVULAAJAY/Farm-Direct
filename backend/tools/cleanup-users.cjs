require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const { admin, db } = require('../config/firebase');
const { sanitizeFirestoreData, serializeData } = require('../services/firebaseService');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function scoreUser(user) {
  const password = typeof user.password === 'string' ? user.password : '';
  const passwordHash = typeof user.passwordHash === 'string' ? user.passwordHash : '';
  const passwordSalt = typeof user.passwordSalt === 'string' ? user.passwordSalt : '';
  const updatedAt = Date.parse(user.updatedAt || user.createdAt || user.joinedDate || '') || 0;

  const isBcrypt = password.startsWith('$2');
  const isPlain = password.length > 0 && !password.startsWith('$2');
  const isScrypt = Boolean(passwordHash && passwordSalt && !passwordHash.startsWith('$2'));

  return {
    rank: isBcrypt ? 3 : isPlain ? 2 : isScrypt ? 1 : 0,
    updatedAt,
  };
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
    console.log('Dry run only. Re-run with --apply to delete duplicate docs and normalize bcrypt-backed records.');
    return;
  }

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [email, items] of grouped.entries()) {
    const sorted = items.slice().sort((left, right) => {
      const leftScore = scoreUser(left);
      const rightScore = scoreUser(right);
      if (rightScore.rank !== leftScore.rank) return rightScore.rank - leftScore.rank;
      return rightScore.updatedAt - leftScore.updatedAt;
    });

    const keeper = sorted[0];
    const duplicates = sorted.slice(1);

    if (duplicates.length > 0) {
      console.log(`[Cleanup] ${email}: keeping ${keeper.id}, deleting ${duplicates.map((item) => item.id).join(', ')}`);
      const batch = db.batch();
      for (const duplicate of duplicates) {
        batch.delete(db.collection('users').doc(duplicate.id));
        deletedCount += 1;
      }
      await batch.commit();
    }

    const password = typeof keeper.password === 'string' ? keeper.password : '';
    const isBcrypt = password.startsWith('$2');

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
    if (keeper.email !== email) {
      await db.collection('users').doc(keeper.id).set({ email }, { merge: true });
      updatedCount += 1;
    }
  }

  console.log(`[Cleanup] Completed. Deleted ${deletedCount} duplicate docs, updated ${updatedCount} doc(s).`);
}

main().catch((error) => {
  console.error('[Cleanup] Failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});