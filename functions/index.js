const { randomUUID } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { FAMILY_CREATED_BY_COLLECTIONS, deletionMode, hasRecentVerifiedAuth } = require('./account-lifecycle');

initializeApp();

const db = getFirestore();

async function anonymizeGuardianReferences(familyRef, userId) {
  const peopleSnapshot = await familyRef.collection('people').get();
  const snapshots = await Promise.all([
    ...FAMILY_CREATED_BY_COLLECTIONS.map((name) => familyRef.collection(name).where('createdBy', '==', userId).get()),
    ...peopleSnapshot.docs.map((person) => person.ref.collection('relationships').where('createdBy', '==', userId).get()),
  ]);
  const references = snapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref));
  for (let index = 0; index < references.length; index += 400) {
    const batch = db.batch();
    references.slice(index, index + 400).forEach((reference) => {
      batch.update(reference, { createdBy: 'deleted-member' });
    });
    await batch.commit();
  }
}

exports.deleteLifeBookAccount = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before requesting account deletion.');
    }
    if (!hasRecentVerifiedAuth(request.auth)) {
      throw new HttpsError('failed-precondition', 'Confirm your password again before deleting this account.');
    }

    const userId = request.auth.uid;
    const requestId = randomUUID();
    const receiptRef = db.doc(`deletionReceipts/${requestId}`);
    const userRef = db.doc(`users/${userId}`);
    const userSnapshot = await userRef.get();
    const familyId = userSnapshot.exists && typeof userSnapshot.get('familyId') === 'string'
      ? userSnapshot.get('familyId')
      : '';

    let familyRef = null;
    let memberRef = null;
    let mode = 'family-missing';
    if (familyId) {
      familyRef = db.doc(`families/${familyId}`);
      memberRef = familyRef.collection('members').doc(userId);
      const [familySnapshot, memberSnapshot, membersSnapshot] = await Promise.all([
        familyRef.get(),
        memberRef.get(),
        familyRef.collection('members').get(),
      ]);
      if (familySnapshot.exists) {
        mode = deletionMode(memberSnapshot.get('role'), membersSnapshot.size);
      }

      if (mode === 'transfer-required') {
        throw new HttpsError(
          'failed-precondition',
          'Transfer family ownership before deleting an owner account with other family members.',
        );
      }
      if (mode === 'denied') {
        throw new HttpsError('permission-denied', 'This account is not an authorized family member.');
      }
    }

    await receiptRef.set({
      requestId,
      status: 'processing',
      requestedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      schemaVersion: 1,
    });

    try {
      if (mode === 'family') {
        await getStorage().bucket().deleteFiles({ prefix: `families/${familyId}/` });
        await db.recursiveDelete(familyRef);
      } else if (mode === 'membership') {
        await anonymizeGuardianReferences(familyRef, userId);
        await memberRef.delete();
      }

      if (userSnapshot.exists) {
        await db.recursiveDelete(userRef);
      }
      await getAuth().deleteUser(userId);

      await receiptRef.update({ status: 'complete', deletedAt: Timestamp.now() });
    } catch (error) {
      await receiptRef.update({ status: 'failed', failedAt: Timestamp.now() }).catch(() => undefined);
      throw error;
    }

    return { ok: true, requestId };
  },
);

exports.purgeExpiredDeletionReceipts = onSchedule(
  { region: 'us-central1', schedule: 'every day 03:00', timeZone: 'Etc/UTC' },
  async () => {
    const expired = await db.collection('deletionReceipts')
      .where('expiresAt', '<=', Timestamp.now())
      .limit(500)
      .get();
    if (expired.empty) {
      return;
    }
    const batch = db.batch();
    expired.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    await batch.commit();
  },
);
