import type { FirebaseOptions } from 'firebase/app';

function normalizeEnvironmentValue(value: string | undefined) {
  return value?.trim();
}

const requiredFirebaseEnvironment = {
  apiKey: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
} as const;

const firebaseMeasurementId = normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID);

type FirebaseEnvironmentKey = keyof typeof requiredFirebaseEnvironment;

export const missingFirebaseEnvironmentKeys = (Object.keys(requiredFirebaseEnvironment) as FirebaseEnvironmentKey[])
  .filter((key) => !requiredFirebaseEnvironment[key]?.trim());

export const isFirebaseConfigured = missingFirebaseEnvironmentKeys.length === 0;
export const isFirebaseStorageEnabled =
  normalizeEnvironmentValue(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_ENABLED)?.toLowerCase() === 'true';

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
