import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { getFirebaseOptions } from '@/config/firebase';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: FirebaseAuth.Auth | null = null;
let cachedFirestore: Firestore | null = null;

type ReactNativePersistenceFactory = (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;

export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) {
    return cachedApp;
  }

  const options = getFirebaseOptions();
  if (!options) {
    return null;
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(options);
  return cachedApp;
}

export function getFirebaseFirestore(): Firestore | null {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedFirestore = getFirestore(app);
  return cachedFirestore;
}

export function getFirebaseAuth(): FirebaseAuth.Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  try {
    const persistence = Platform.OS === 'web'
      ? FirebaseAuth.browserLocalPersistence
      : (FirebaseAuth as typeof FirebaseAuth & { getReactNativePersistence: ReactNativePersistenceFactory })
          .getReactNativePersistence(AsyncStorage);

    cachedAuth = FirebaseAuth.initializeAuth(app, {
      persistence,
    });
  } catch {
    cachedAuth = FirebaseAuth.getAuth(app);
  }

  return cachedAuth;
}
