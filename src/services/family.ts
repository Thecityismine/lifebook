import { FirebaseError } from 'firebase/app';
import {
  doc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseFunctions } from '@/services/firebase';

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
    if (error.code === 'functions/unauthenticated') {
      return 'Sign in again before creating your family space.';
    }

    if (error.code === 'functions/failed-precondition'
      || error.code === 'functions/invalid-argument'
      || error.code === 'functions/permission-denied') {
      return error.message || unavailableMessage();
    }

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
  const functions = getFirebaseFunctions();
  if (!user || !functions) {
    return { ok: false, message: unavailableMessage() };
  }

  const cleanName = name.trim();

  try {
    const response = await httpsCallable<
      { name: string },
      { ok: true; familyId: string }
    >(functions, 'createFamilySpace')({ name: cleanName });
    return { ok: true, familyId: response.data.familyId };
  } catch (error) {
    return { ok: false, message: familyErrorMessage(error) };
  }
}

export async function createManagedProfile(firstName: string, relationship: string): Promise<FamilyActionResult> {
  const user = requireVerifiedParent();
  const functions = getFirebaseFunctions();
  if (!user || !functions) {
    return { ok: false, message: unavailableMessage() };
  }

  try {
    const response = await httpsCallable<
      { firstName: string; relationship: string },
      { ok: true; familyId: string; profileId: string }
    >(functions, 'createManagedProfile')({ firstName: firstName.trim(), relationship });
    return {
      ok: true,
      familyId: response.data.familyId,
      profileId: response.data.profileId,
    };
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
