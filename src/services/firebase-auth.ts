import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;

function isAlreadyInitialized(error: unknown) {
  return error instanceof FirebaseError && error.code === 'auth/already-initialized';
}

export function initializeFirebaseAuth(app: FirebaseApp): FirebaseAuth.Auth {
  const getReactNativePersistence = (
    FirebaseAuth as typeof FirebaseAuth & { getReactNativePersistence?: ReactNativePersistenceFactory }
  ).getReactNativePersistence;

  if (!getReactNativePersistence) {
    throw new Error('Firebase Auth persistence is unavailable in this React Native build.');
  }

  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (isAlreadyInitialized(error)) {
      return FirebaseAuth.getAuth(app);
    }
    throw error;
  }
}
