import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'lifebook-31782';
const consentVersion = '2026-08-01.parent-led.v1';
let testEnvironment;

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

async function createFamilySpace(db, userId, email, familyName = 'Medina family') {
  return runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await transaction.get(userRef);
    const existingFamilyId = userSnapshot.exists() && typeof userSnapshot.data().familyId === 'string'
      ? userSnapshot.data().familyId
      : null;
    const familyRef = existingFamilyId ? doc(db, 'families', existingFamilyId) : doc(collection(db, 'families'));
    const memberRef = doc(db, 'families', familyRef.id, 'members', userId);
    const consentRef = doc(db, 'users', userId, 'consents', consentVersion);
    const consentSnapshot = await transaction.get(consentRef);

    if (existingFamilyId) {
      transaction.update(familyRef, { name: familyName, updatedAt: serverTimestamp() });
      return existingFamilyId;
    }

    transaction.set(familyRef, {
      name: familyName,
      ownerId: userId,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(memberRef, {
      userId,
      role: 'owner',
      displayName: 'Parent',
      email,
      joinedAt: serverTimestamp(),
    });
    transaction.set(userRef, {
      userId,
      displayName: 'Parent',
      email,
      familyId: familyRef.id,
      activeProfileId: null,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (!consentSnapshot.exists()) {
      transaction.set(consentRef, {
        userId,
        version: consentVersion,
        guardianConfirmed: true,
        source: 'onboarding',
        acceptedAt: serverTimestamp(),
      });
    }

    return familyRef.id;
  });
}

test('verified parent can create the initial family transaction', async () => {
  const userId = 'new-parent';
  const email = 'new-parent@example.com';
  const db = testEnvironment.authenticatedContext(userId, {
    email,
    email_verified: true,
  }).firestore();

  await assertSucceeds(createFamilySpace(db, userId, email));
});

test('client rules reject repairing an incomplete user record, requiring the verified server path', async () => {
  const userId = 'incomplete-parent';
  const email = 'incomplete-parent@example.com';
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', userId), {
      userId,
      displayName: 'Parent',
      email,
      familyId: null,
      activeProfileId: null,
      onboardingComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  const db = testEnvironment.authenticatedContext(userId, {
    email,
    email_verified: true,
  }).firestore();

  await assertFails(createFamilySpace(db, userId, email));
});

test('signed-in parent can recover their own setup read while unverified writes remain blocked', async () => {
  const userId = 'stale-token-parent';
  const email = 'stale-token-parent@example.com';
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', userId), {
      userId,
      displayName: 'Parent',
      email,
      familyId: 'family-created-by-server',
      activeProfileId: null,
      onboardingComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await setDoc(doc(db, 'users', userId, 'consents', consentVersion), {
      userId,
      version: consentVersion,
      guardianConfirmed: true,
      source: 'onboarding',
      acceptedAt: new Date(),
    });
  });

  const db = testEnvironment.authenticatedContext(userId, {
    email,
    email_verified: false,
  }).firestore();

  await assertSucceeds(getDoc(doc(db, 'users', userId)));
  await assertSucceeds(getDoc(doc(db, 'users', userId, 'consents', consentVersion)));
  await assertFails(updateDoc(doc(db, 'users', userId), {
    activeProfileId: 'profile-not-allowed',
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  }));
});
