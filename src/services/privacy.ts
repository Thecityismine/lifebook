import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Platform, Share } from 'react-native';

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseFunctions } from '@/services/firebase';

export type FamilyRole = 'owner' | 'guardian' | 'member';

export type PrivacySettings = {
  defaultVisibility: 'family';
  guardianCanEdit: boolean;
};

export type ConsentRecord = {
  id: string;
  version: string;
  source: string;
  guardianConfirmed: boolean;
  acceptedAt: Timestamp | null;
};

export type PrivacyActionResult =
  | { ok: true; requestId?: string; fileName?: string }
  | { ok: false; message: string };

function privacyErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'functions/permission-denied') {
      return 'LifeBook could not verify permission for this privacy action.';
    }
    if (error.code === 'functions/failed-precondition') {
      return typeof error.message === 'string' && error.message
        ? error.message
        : 'Confirm your password again before continuing.';
    }
    if (error.code === 'unavailable' || error.code === 'functions/unavailable') {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }
  return 'LifeBook could not complete this privacy action right now. Please try again.';
}

function requireVerifiedParent() {
  const user = getFirebaseAuth()?.currentUser;
  return user?.emailVerified ? user : null;
}

export function subscribeToPrivacySettings(
  familyId: string,
  onValue: (settings: PrivacySettings) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('Privacy settings are not configured on this device.');
    return () => undefined;
  }
  return onSnapshot(doc(db, 'families', familyId, 'settings', 'privacy'), (snapshot) => {
    onValue({
      defaultVisibility: 'family',
      guardianCanEdit: snapshot.exists() ? snapshot.data().guardianCanEdit === true : true,
    });
  }, (error) => onError(privacyErrorMessage(error)));
}

export function subscribeToFamilyRole(
  familyId: string,
  userId: string,
  onValue: (role: FamilyRole) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('Family permissions are not configured on this device.');
    return () => undefined;
  }
  return onSnapshot(doc(db, 'families', familyId, 'members', userId), (snapshot) => {
    const role = snapshot.exists() && typeof snapshot.data().role === 'string' ? snapshot.data().role : 'member';
    onValue(role === 'owner' || role === 'guardian' ? role : 'member');
  }, (error) => onError(privacyErrorMessage(error)));
}

export function subscribeToConsentHistory(
  userId: string,
  onValue: (records: ConsentRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('Consent history is not configured on this device.');
    return () => undefined;
  }
  return onSnapshot(collection(db, 'users', userId, 'consents'), (snapshot) => {
    onValue(snapshot.docs.map((item) => ({
      id: item.id,
      version: typeof item.data().version === 'string' ? item.data().version : item.id,
      source: typeof item.data().source === 'string' ? item.data().source : '',
      guardianConfirmed: item.data().guardianConfirmed === true,
      acceptedAt: item.data().acceptedAt && typeof item.data().acceptedAt === 'object'
        ? item.data().acceptedAt as Timestamp
        : null,
    })).sort((left, right) => (right.acceptedAt?.seconds || 0) - (left.acceptedAt?.seconds || 0)));
  }, (error) => onError(privacyErrorMessage(error)));
}

export async function savePrivacySettings(
  familyId: string,
  settings: PrivacySettings,
): Promise<PrivacyActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified owner account to update privacy settings.' };
  }
  try {
    const settingsRef = doc(db, 'families', familyId, 'settings', 'privacy');
    const auditRef = doc(collection(db, 'families', familyId, 'auditEvents'));
    const existing = await getDoc(settingsRef);
    const batch = writeBatch(db);
    const values = {
      familyId,
      defaultVisibility: 'family',
      guardianCanEdit: settings.guardianCanEdit,
      updatedBy: user.uid,
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      batch.update(settingsRef, values);
    } else {
      batch.set(settingsRef, { ...values, createdAt: serverTimestamp() });
    }
    batch.set(auditRef, {
      familyId,
      eventType: 'privacy_settings_updated',
      actorId: user.uid,
      summary: settings.guardianCanEdit ? 'Guardian editing enabled.' : 'Guardian editing disabled.',
      schemaVersion: 1,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: privacyErrorMessage(error) };
  }
}

function records(snapshot: QuerySnapshot<DocumentData>) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function serializable(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializable);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializable(child)]));
  }
  return value;
}

export async function createFamilyExport(familyId: string): Promise<PrivacyActionResult & { json?: string }> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to export this LifeBook.' };
  }
  try {
    const [
      accountSnapshot, consentSnapshot, familySnapshot, memberSnapshot, profileSnapshot,
      peopleSnapshot, memorySnapshot, chapterSnapshot, reminderSnapshot, settingsSnapshot, auditSnapshot,
    ] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDocs(collection(db, 'users', user.uid, 'consents')),
      getDoc(doc(db, 'families', familyId)),
      getDocs(collection(db, 'families', familyId, 'members')),
      getDocs(collection(db, 'families', familyId, 'profiles')),
      getDocs(collection(db, 'families', familyId, 'people')),
      getDocs(collection(db, 'families', familyId, 'memories')),
      getDocs(collection(db, 'families', familyId, 'chapters')),
      getDocs(collection(db, 'families', familyId, 'reminders')),
      getDoc(doc(db, 'families', familyId, 'settings', 'privacy')),
      getDocs(collection(db, 'families', familyId, 'auditEvents')),
    ]);
    const relationships = (await Promise.all(peopleSnapshot.docs.map(async (person) => ({
      personId: person.id,
      records: records(await getDocs(collection(db, 'families', familyId, 'people', person.id, 'relationships'))),
    })))).filter((item) => item.records.length > 0);
    const output = serializable({
      format: 'lifebook-family-export',
      formatVersion: 1,
      generatedAt: new Date().toISOString(),
      account: accountSnapshot.exists() ? { id: accountSnapshot.id, ...accountSnapshot.data() } : null,
      consentHistory: records(consentSnapshot),
      family: familySnapshot.exists() ? { id: familySnapshot.id, ...familySnapshot.data() } : null,
      members: records(memberSnapshot),
      profiles: records(profileSnapshot),
      people: records(peopleSnapshot),
      relationships,
      memories: records(memorySnapshot),
      chapters: records(chapterSnapshot),
      reminders: records(reminderSnapshot),
      privacySettings: settingsSnapshot.exists() ? settingsSnapshot.data() : { defaultVisibility: 'family', guardianCanEdit: true },
      auditEvents: records(auditSnapshot),
    });
    return { ok: true, json: JSON.stringify(output, null, 2) };
  } catch (error) {
    return { ok: false, message: privacyErrorMessage(error) };
  }
}

export async function saveFamilyExport(json: string): Promise<PrivacyActionResult> {
  const fileName = `lifebook-export-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return { ok: true, fileName };
    }
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export your LifeBook' });
    } else {
      await Share.share({ title: 'LifeBook export', message: json });
    }
    return { ok: true, fileName };
  } catch (error) {
    return { ok: false, message: privacyErrorMessage(error) };
  }
}

export async function requestAccountDeletion(): Promise<PrivacyActionResult> {
  const functions = getFirebaseFunctions();
  if (!requireVerifiedParent() || !functions) {
    return { ok: false, message: 'Sign in with a verified parent account before requesting deletion.' };
  }
  try {
    const callable = httpsCallable<Record<string, never>, { ok: boolean; requestId: string }>(functions, 'deleteLifeBookAccount');
    const response = await callable({});
    return response.data.ok
      ? { ok: true, requestId: response.data.requestId }
      : { ok: false, message: 'LifeBook could not confirm account deletion.' };
  } catch (error) {
    return { ok: false, message: privacyErrorMessage(error) };
  }
}
