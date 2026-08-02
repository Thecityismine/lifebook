import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getIdToken,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  signOut,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/services/firebase';

export type AuthActionResult =
  | { ok: true; emailVerified?: boolean; verificationSent?: boolean }
  | { ok: false; code: 'not-configured' | 'request-failed'; message: string };

function unavailableResult(): AuthActionResult {
  return {
    ok: false,
    code: 'not-configured',
    message: 'Secure account access is waiting for the development Firebase configuration.',
  };
}

function messageForFirebaseError(error: unknown, action: 'create' | 'sign-in'): string {
  if (!(error instanceof FirebaseError)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.code === 'auth/network-request-failed') {
    return 'LifeBook could not reach the secure account service. Check your connection and try again.';
  }

  if (error.code === 'auth/too-many-requests') {
    return 'Account access is temporarily limited. Please wait a little while and try again.';
  }

  if (error.code === 'auth/invalid-email') {
    return 'Check the email address and try again.';
  }

  if (error.code === 'auth/weak-password') {
    return 'Choose a stronger password and try again.';
  }

  if (action === 'sign-in') {
    return 'LifeBook could not sign in with those details. Check them and try again.';
  }

  return 'LifeBook could not create an account with those details. Review them and try again.';
}

export async function signInParent(email: string, password: string): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return unavailableResult();
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, emailVerified: credential.user.emailVerified };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'sign-in') };
  }
}

export async function createParentAccount(name: string, email: string, password: string): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return unavailableResult();
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // The account already exists after createUserWithEmailAndPassword succeeds.
    // Keep optional profile metadata from turning a successful account creation
    // into an apparent failure that the parent cannot safely retry.
    try {
      await updateProfile(credential.user, { displayName: name.trim() });
    } catch {
      // Profile details can be reconciled after onboarding.
    }

    let verificationSent = true;

    try {
      await sendEmailVerification(credential.user);
    } catch {
      verificationSent = false;
    }

    return { ok: true, emailVerified: false, verificationSent };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'create') };
  }
}

export async function resendParentVerification(): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return unavailableResult();
  }

  if (!auth.currentUser) {
    return {
      ok: false,
      code: 'request-failed',
      message: 'Sign in again before requesting another verification email.',
    };
  }

  try {
    await sendEmailVerification(auth.currentUser);
    return { ok: true, verificationSent: true };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'sign-in') };
  }
}

export async function checkParentVerification(): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return unavailableResult();
  }

  if (!auth.currentUser) {
    return {
      ok: false,
      code: 'request-failed',
      message: 'Sign in again to finish verifying this account.',
    };
  }

  try {
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      await getIdToken(auth.currentUser, true);
    }
    return { ok: true, emailVerified: auth.currentUser.emailVerified };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'sign-in') };
  }
}

export async function signOutParent(): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return unavailableResult();
  }

  try {
    await signOut(auth);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'sign-in') };
  }
}

export async function reauthenticateParent(password: string): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user?.email) {
    return unavailableResult();
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await getIdToken(user, true);
    return { ok: true, emailVerified: user.emailVerified };
  } catch (error) {
    return { ok: false, code: 'request-failed', message: messageForFirebaseError(error, 'sign-in') };
  }
}
