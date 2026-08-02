import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { getFirebaseOptions, isFirebaseStorageEnabled } from '@/config/firebase';
import { initializeFirebaseAuth } from '@/services/firebase-auth';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;
let cachedFunctions: Functions | null = null;

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

export function getFirebaseStorage(): FirebaseStorage | null {
  if (!isFirebaseStorageEnabled) {
    return null;
  }

  if (cachedStorage) {
    return cachedStorage;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedStorage = getStorage(app);
  return cachedStorage;
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedAuth = initializeFirebaseAuth(app);
  return cachedAuth;
}

export function getFirebaseFunctions(): Functions | null {
  if (cachedFunctions) {
    return cachedFunctions;
  }
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  cachedFunctions = getFunctions(app, 'us-central1');
  return cachedFunctions;
}
