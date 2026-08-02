import type { FirebaseOptions } from 'firebase/app';

const requiredFirebaseEnvironment = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

const firebaseMeasurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

type FirebaseEnvironmentKey = keyof typeof requiredFirebaseEnvironment;

export const missingFirebaseEnvironmentKeys = (Object.keys(requiredFirebaseEnvironment) as FirebaseEnvironmentKey[])
  .filter((key) => !requiredFirebaseEnvironment[key]?.trim());

export const isFirebaseConfigured = missingFirebaseEnvironmentKeys.length === 0;
export const isFirebaseStorageEnabled =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_ENABLED?.trim().toLowerCase() === 'true';

export function getFirebaseOptions(): FirebaseOptions | null {
  if (!isFirebaseConfigured) {
    return null;
  }

  return {
    apiKey: requiredFirebaseEnvironment.apiKey,
    authDomain: requiredFirebaseEnvironment.authDomain,
    projectId: requiredFirebaseEnvironment.projectId,
    storageBucket: requiredFirebaseEnvironment.storageBucket,
    messagingSenderId: requiredFirebaseEnvironment.messagingSenderId,
    appId: requiredFirebaseEnvironment.appId,
    measurementId: firebaseMeasurementId,
  };
}
