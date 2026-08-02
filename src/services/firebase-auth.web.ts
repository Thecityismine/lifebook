import { FirebaseError, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

function isAlreadyInitialized(error: unknown) {
  return error instanceof FirebaseError && error.code === 'auth/already-initialized';
}

export function initializeFirebaseAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } catch (error) {
    if (isAlreadyInitialized(error)) {
      return getAuth(app);
    }
    throw error;
  }
}
