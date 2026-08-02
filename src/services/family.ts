import { FirebaseError } from 'firebase/app';
import { getIdToken, getIdTokenResult } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { PARENT_CONSENT_SOURCE, PARENT_CONSENT_VERSION } from '@/constants/privacy';
import { getFirebaseAuth, getFirebaseFirestore } from '@/services/firebase';

export type ParentSetup = {
  familyId: string | null;
  activeProfileId: string | null;
  onboardingComplete: boolean;
};

export type FamilySummary = {
  familyName: string;
  profileName: string;
};

export type FamilyActionResult =
  | { ok: true; familyId: string; profileId?: string }
  | { ok: false; message: string };

function unavailableMessage() {
  return 'Your private family space is not available right now. Please try again.';
}

function familyErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'LifeBook could not verify permission for this family space. Sign in again and try once more.';
    }

    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }

  return unavailableMessage();
}

function requireVerifiedParent() {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;

  if (!user || !user.emailVerified) {
    return null;
  }

  return user;
}

export function subscribeToParentSetup(
  userId: string,
  onValue: (setup: ParentSetup | null) => void,
  onError: () => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError();
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onValue(null);
        return;
      }

      const data = snapshot.data();
      onValue({
        familyId: typeof data.familyId === 'string' ? data.familyId : null,
        activeProfileId: typeof data.activeProfileId === 'string' ? data.activeProfileId : null,
        onboardingComplete: data.onboardingComplete === true,
      });
    },
    onError,
  );
}

export async function createFamilySpace(name: string): Promise<FamilyActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: unavailableMessage() };
  }

  const cleanName = name.trim();

  try {
    // Email verification changes an ID-token claim. Reuse a current verified
    // token, and force a refresh only when an open session still has the old
    // claim. This avoids restarting auth-dependent work on every family save.
    const tokenResult = await getIdTokenResult(user);
    if (tokenResult.claims.email_verified !== true) {
      await getIdToken(user, true);
    }
    const familyId = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', user.uid);
      const userSnapshot = await transaction.get(userRef);
      const existingFamilyId = userSnapshot.exists() && typeof userSnapshot.data().familyId === 'string'
        ? userSnapshot.data().familyId as string
        : null;
      const familyRef = existingFamilyId ? doc(db, 'families', existingFamilyId) : doc(collection(db, 'families'));
      const memberRef = doc(db, 'families', familyRef.id, 'members', user.uid);
      const consentRef = doc(db, 'users', user.uid, 'consents', PARENT_CONSENT_VERSION);
      const consentSnapshot = await transaction.get(consentRef);

      if (existingFamilyId) {
        transaction.update(familyRef, { name: cleanName, updatedAt: serverTimestamp() });
        return existingFamilyId;
      }

      transaction.set(familyRef, {
        name: cleanName,
        ownerId: user.uid,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(memberRef, {
        userId: user.uid,
        role: 'owner',
        displayName: user.displayName?.trim() || 'Parent',
        email: user.email || '',
        joinedAt: serverTimestamp(),
      });
      transaction.set(userRef, {
        userId: user.uid,
        displayName: user.displayName?.trim() || 'Parent',
        email: user.email || '',
        familyId: familyRef.id,
        activeProfileId: null,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (!consentSnapshot.exists()) {
        transaction.set(consentRef, {
          userId: user.uid,
          version: PARENT_CONSENT_VERSION,
          guardianConfirmed: true,
          source: PARENT_CONSENT_SOURCE,
          acceptedAt: serverTimestamp(),
        });
      }

      return familyRef.id;
    });

    return { ok: true, familyId };
  } catch (error) {
    return { ok: false, message: familyErrorMessage(error) };
  }
}

export async function createManagedProfile(firstName: string, relationship: string): Promise<FamilyActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: unavailableMessage() };
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    const familyId = userSnapshot.exists() && typeof userSnapshot.data().familyId === 'string'
      ? userSnapshot.data().familyId as string
      : null;

    if (!familyId) {
      return { ok: false, message: 'Create the private family space before adding a managed profile.' };
    }

    const profileRef = doc(collection(db, 'families', familyId, 'profiles'));
    const batch = writeBatch(db);
    batch.set(profileRef, {
      familyId,
      firstName: firstName.trim(),
      relationship,
      managed: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(userRef, {
      activeProfileId: profileRef.id,
      onboardingComplete: true,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return { ok: true, familyId, profileId: profileRef.id };
  } catch (error) {
    return { ok: false, message: familyErrorMessage(error) };
  }
}

export async function getFamilySummary(setup: ParentSetup): Promise<FamilySummary | null> {
  const db = getFirebaseFirestore();
  if (!db || !setup.familyId || !setup.activeProfileId) {
    return null;
  }

  const [familySnapshot, profileSnapshot] = await Promise.all([
    getDoc(doc(db, 'families', setup.familyId)),
    getDoc(doc(db, 'families', setup.familyId, 'profiles', setup.activeProfileId)),
  ]);

  if (!familySnapshot.exists() || !profileSnapshot.exists()) {
    return null;
  }

  return {
    familyName: typeof familySnapshot.data().name === 'string' ? familySnapshot.data().name : 'Your family LifeBook',
    profileName: typeof profileSnapshot.data().firstName === 'string' ? profileSnapshot.data().firstName : 'Your family',
  };
}
