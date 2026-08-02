const { randomUUID } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { FAMILY_CREATED_BY_COLLECTIONS, deletionMode, hasRecentVerifiedAuth } = require('./account-lifecycle');
const {
  INVITE_LIFETIME_MS,
  createInviteToken,
  inviteIsUsable,
  inviteSecretMatches,
  normalizeEmail,
  parseInviteToken,
  validInviteEmail,
  validInviteRole,
} = require('./family-collaboration');

initializeApp();

const db = getFirestore();
const PARENT_CONSENT_VERSION = '2026-08-01.parent-led.v1';

function requireVerifiedAccount(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before managing family access.');
  }
  const email = normalizeEmail(request.auth.token?.email);
  if (request.auth.token?.email_verified !== true || !validInviteEmail(email)) {
    throw new HttpsError('failed-precondition', 'Verify your email address before managing family access.');
  }
  return { userId: request.auth.uid, email };
}

async function requireFamilyOwner(familyId, userId) {
  if (typeof familyId !== 'string' || familyId.length < 10 || familyId.length > 128) {
    throw new HttpsError('invalid-argument', 'Choose a valid family space.');
  }
  const familyRef = db.doc(`families/${familyId}`);
  const memberRef = familyRef.collection('members').doc(userId);
  const [familySnapshot, memberSnapshot] = await Promise.all([familyRef.get(), memberRef.get()]);
  if (!familySnapshot.exists
    || familySnapshot.get('ownerId') !== userId
    || !memberSnapshot.exists
    || memberSnapshot.get('role') !== 'owner') {
    throw new HttpsError('permission-denied', 'Only the family owner can make this change.');
  }
  return { familyRef, familySnapshot };
}

function invalidInvite() {
  return new HttpsError('not-found', 'This invitation is invalid, expired, or no longer available.');
}

async function resolveInvite(token, email) {
  const parsed = parseInviteToken(token);
  if (!parsed) {
    throw invalidInvite();
  }
  const familyRef = db.doc(`families/${parsed.familyId}`);
  const inviteRef = familyRef.collection('invites').doc(parsed.inviteId);
  const [familySnapshot, inviteSnapshot] = await Promise.all([familyRef.get(), inviteRef.get()]);
  if (!familySnapshot.exists || !inviteSnapshot.exists) {
    throw invalidInvite();
  }
  const invite = inviteSnapshot.data();
  if (!inviteIsUsable(invite) || !inviteSecretMatches(parsed.secret, invite.tokenHash)) {
    throw invalidInvite();
  }
  if (normalizeEmail(invite.emailLower || invite.email) !== email) {
    throw new HttpsError('permission-denied', 'Sign in with the email address that received this invitation.');
  }
  return { parsed, familyRef, familySnapshot, inviteRef, inviteSnapshot };
}

function auditEvent(familyId, eventType, actorId, summary, createdAt = Timestamp.now()) {
  return { familyId, eventType, actorId, summary, schemaVersion: 1, createdAt };
}

exports.createFamilyInvite = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    const { userId, email: actorEmail } = requireVerifiedAccount(request);
    const familyId = request.data?.familyId;
    const email = normalizeEmail(request.data?.email);
    const role = request.data?.role;
    if (!validInviteEmail(email) || !validInviteRole(role)) {
      throw new HttpsError('invalid-argument', 'Enter a valid email and choose Guardian or Viewer.');
    }
    if (email === actorEmail) {
      throw new HttpsError('invalid-argument', 'The family owner already has access.');
    }

    const { familyRef } = await requireFamilyOwner(familyId, userId);
    const [membersSnapshot, pendingSnapshot] = await Promise.all([
      familyRef.collection('members').get(),
      familyRef.collection('invites').where('status', '==', 'pending').get(),
    ]);
    if (membersSnapshot.docs.some((member) => normalizeEmail(member.get('email')) === email)) {
      throw new HttpsError('already-exists', 'That email already belongs to this family space.');
    }

    const activeInvites = pendingSnapshot.docs.filter((invite) => inviteIsUsable(invite.data()));
    if (activeInvites.length >= 20) {
      throw new HttpsError('resource-exhausted', 'Revoke an unused invitation before creating another one.');
    }

    const inviteRef = familyRef.collection('invites').doc();
    const { token, tokenHash } = createInviteToken(familyId, inviteRef.id);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + INVITE_LIFETIME_MS);
    const batch = db.batch();
    activeInvites
      .filter((invite) => normalizeEmail(invite.get('emailLower') || invite.get('email')) === email)
      .forEach((invite) => batch.update(invite.ref, { status: 'revoked', revokedAt: now }));
    batch.set(inviteRef, {
      familyId,
      inviteId: inviteRef.id,
      email,
      emailLower: email,
      role,
      status: 'pending',
      tokenHash,
      createdBy: userId,
      createdAt: now,
      expiresAt,
      acceptedBy: null,
      acceptedAt: null,
      revokedAt: null,
      schemaVersion: 1,
    });
    batch.set(
      familyRef.collection('auditEvents').doc(),
      auditEvent(familyId, 'family_invite_created', userId, `Invitation created for ${email} as ${role}.`, now),
    );
    await batch.commit();
    return { ok: true, inviteId: inviteRef.id, token, expiresAt: expiresAt.toMillis() };
  },
);

exports.previewFamilyInvite = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    const { email } = requireVerifiedAccount(request);
    const resolved = await resolveInvite(request.data?.token, email);
    return {
      ok: true,
      familyId: resolved.parsed.familyId,
      familyName: resolved.familySnapshot.get('name') || 'A private LifeBook family',
      role: resolved.inviteSnapshot.get('role'),
      email,
      expiresAt: resolved.inviteSnapshot.get('expiresAt').toMillis(),
    };
  },
);

exports.acceptFamilyInvite = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    const { userId, email } = requireVerifiedAccount(request);
    if (request.data?.guardianConfirmed !== true) {
      throw new HttpsError('failed-precondition', 'Confirm that you are an adult responsible for this family space.');
    }
    const resolved = await resolveInvite(request.data?.token, email);
    const profileSnapshot = await resolved.familyRef.collection('profiles').limit(1).get();
    const activeProfileId = profileSnapshot.docs[0]?.id || '';
    if (!activeProfileId) {
      throw new HttpsError('failed-precondition', 'This family space is not ready to accept members yet.');
    }

    const memberRef = resolved.familyRef.collection('members').doc(userId);
    const userRef = db.doc(`users/${userId}`);
    const consentRef = userRef.collection('consents').doc(PARENT_CONSENT_VERSION);
    const auditRef = resolved.familyRef.collection('auditEvents').doc();
    const displayName = typeof request.auth.token?.name === 'string' && request.auth.token.name.trim()
      ? request.auth.token.name.trim().slice(0, 100)
      : email.split('@')[0].slice(0, 100);

    await db.runTransaction(async (transaction) => {
      const [familySnapshot, inviteSnapshot, memberSnapshot, userSnapshot, consentSnapshot] = await Promise.all([
        transaction.get(resolved.familyRef),
        transaction.get(resolved.inviteRef),
        transaction.get(memberRef),
        transaction.get(userRef),
        transaction.get(consentRef),
      ]);
      if (!familySnapshot.exists || !inviteSnapshot.exists) {
        throw invalidInvite();
      }
      const invite = inviteSnapshot.data();
      if (!inviteIsUsable(invite)
        || !inviteSecretMatches(resolved.parsed.secret, invite.tokenHash)
        || normalizeEmail(invite.emailLower || invite.email) !== email) {
        throw invalidInvite();
      }
      const existingFamilyId = userSnapshot.exists && typeof userSnapshot.get('familyId') === 'string'
        ? userSnapshot.get('familyId')
        : '';
      if (existingFamilyId && existingFamilyId !== resolved.parsed.familyId) {
        throw new HttpsError('failed-precondition', 'This account already belongs to another family space.');
      }

      const now = Timestamp.now();
      if (!memberSnapshot.exists) {
        transaction.set(memberRef, {
          userId,
          role: invite.role,
          displayName,
          email,
          joinedAt: now,
        });
      }
      transaction.set(userRef, {
        userId,
        displayName,
        email,
        familyId: resolved.parsed.familyId,
        activeProfileId,
        onboardingComplete: true,
        createdAt: userSnapshot.exists && userSnapshot.get('createdAt') ? userSnapshot.get('createdAt') : now,
        updatedAt: now,
      }, { merge: true });
      if (!consentSnapshot.exists) {
        transaction.set(consentRef, {
          userId,
          version: PARENT_CONSENT_VERSION,
          guardianConfirmed: true,
          source: 'family-invite',
          acceptedAt: now,
        });
      }
      transaction.update(resolved.inviteRef, { status: 'accepted', acceptedBy: userId, acceptedAt: now });
      transaction.set(
        auditRef,
        auditEvent(resolved.parsed.familyId, 'family_invite_accepted', userId, `${email} joined as ${invite.role}.`, now),
      );
    });

    return { ok: true, familyId: resolved.parsed.familyId, activeProfileId };
  },
);

exports.revokeFamilyInvite = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    const { userId } = requireVerifiedAccount(request);
    const familyId = request.data?.familyId;
    const inviteId = request.data?.inviteId;
    const { familyRef } = await requireFamilyOwner(familyId, userId);
    if (typeof inviteId !== 'string' || inviteId.length < 10 || inviteId.length > 128) {
      throw new HttpsError('invalid-argument', 'Choose a valid invitation.');
    }
    const inviteRef = familyRef.collection('invites').doc(inviteId);
    const inviteSnapshot = await inviteRef.get();
    if (!inviteSnapshot.exists || inviteSnapshot.get('status') !== 'pending') {
      throw new HttpsError('not-found', 'This invitation is no longer pending.');
    }
    const now = Timestamp.now();
    const batch = db.batch();
    batch.update(inviteRef, { status: 'revoked', revokedAt: now });
    batch.set(
      familyRef.collection('auditEvents').doc(),
      auditEvent(familyId, 'family_invite_revoked', userId, `Invitation revoked for ${inviteSnapshot.get('email')}.`, now),
    );
    await batch.commit();
    return { ok: true };
  },
);

exports.updateFamilyMemberRole = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 30 },
  async (request) => {
    const { userId } = requireVerifiedAccount(request);
    const familyId = request.data?.familyId;
    const targetUserId = request.data?.targetUserId;
    const role = request.data?.role;
    const { familyRef } = await requireFamilyOwner(familyId, userId);
    if (typeof targetUserId !== 'string' || targetUserId === userId || !validInviteRole(role)) {
      throw new HttpsError('invalid-argument', 'Choose a non-owner member and a valid role.');
    }
    const targetRef = familyRef.collection('members').doc(targetUserId);
    const targetSnapshot = await targetRef.get();
    if (!targetSnapshot.exists || targetSnapshot.get('role') === 'owner') {
      throw new HttpsError('not-found', 'That family member is no longer available.');
    }
    const now = Timestamp.now();
    const batch = db.batch();
    batch.update(targetRef, { role });
    batch.set(
      familyRef.collection('auditEvents').doc(),
      auditEvent(familyId, 'member_role_changed', userId, `${targetSnapshot.get('email')} changed to ${role}.`, now),
    );
    await batch.commit();
    return { ok: true };
  },
);

exports.removeFamilyMember = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    const { userId } = requireVerifiedAccount(request);
    const familyId = request.data?.familyId;
    const targetUserId = request.data?.targetUserId;
    const { familyRef } = await requireFamilyOwner(familyId, userId);
    if (typeof targetUserId !== 'string' || targetUserId === userId) {
      throw new HttpsError('invalid-argument', 'Choose a non-owner family member.');
    }
    const targetRef = familyRef.collection('members').doc(targetUserId);
    const targetUserRef = db.doc(`users/${targetUserId}`);
    const auditRef = familyRef.collection('auditEvents').doc();
    await db.runTransaction(async (transaction) => {
      const [targetSnapshot, targetUserSnapshot] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(targetUserRef),
      ]);
      if (!targetSnapshot.exists || targetSnapshot.get('role') === 'owner') {
        throw new HttpsError('not-found', 'That family member is no longer available.');
      }
      const now = Timestamp.now();
      transaction.delete(targetRef);
      if (targetUserSnapshot.exists && targetUserSnapshot.get('familyId') === familyId) {
        transaction.delete(targetUserRef);
      }
      transaction.set(
        auditRef,
        auditEvent(familyId, 'member_removed', userId, `${targetSnapshot.get('email')} was removed from the family.`, now),
      );
    });
    return { ok: true };
  },
);

exports.transferFamilyOwnership = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    const { userId } = requireVerifiedAccount(request);
    if (!hasRecentVerifiedAuth(request.auth)) {
      throw new HttpsError('failed-precondition', 'Confirm your password again before transferring ownership.');
    }
    const familyId = request.data?.familyId;
    const targetUserId = request.data?.targetUserId;
    const { familyRef } = await requireFamilyOwner(familyId, userId);
    if (typeof targetUserId !== 'string' || targetUserId === userId) {
      throw new HttpsError('invalid-argument', 'Choose another family member as the new owner.');
    }
    const ownerMemberRef = familyRef.collection('members').doc(userId);
    const targetMemberRef = familyRef.collection('members').doc(targetUserId);
    const auditRef = familyRef.collection('auditEvents').doc();
    await db.runTransaction(async (transaction) => {
      const [familySnapshot, ownerSnapshot, targetSnapshot] = await Promise.all([
        transaction.get(familyRef),
        transaction.get(ownerMemberRef),
        transaction.get(targetMemberRef),
      ]);
      if (!familySnapshot.exists
        || familySnapshot.get('ownerId') !== userId
        || !ownerSnapshot.exists
        || ownerSnapshot.get('role') !== 'owner') {
        throw new HttpsError('permission-denied', 'Only the current family owner can transfer ownership.');
      }
      if (!targetSnapshot.exists || targetSnapshot.get('role') === 'owner') {
        throw new HttpsError('not-found', 'That family member is no longer available.');
      }
      const now = Timestamp.now();
      transaction.update(familyRef, { ownerId: targetUserId, updatedAt: now });
      transaction.update(ownerMemberRef, { role: 'guardian' });
      transaction.update(targetMemberRef, { role: 'owner' });
      transaction.set(
        auditRef,
        auditEvent(familyId, 'ownership_transferred', userId, `Ownership transferred to ${targetSnapshot.get('email')}.`, now),
      );
    });
    return { ok: true, newOwnerId: targetUserId };
  },
);

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

exports.purgeExpiredFamilyInvites = onSchedule(
  { region: 'us-central1', schedule: 'every day 03:15', timeZone: 'Etc/UTC' },
  async () => {
    const expired = await db.collectionGroup('invites')
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
