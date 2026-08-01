import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from '@/services/firebase';

export type MemoryRecord = {
  id: string;
  familyId: string;
  profileId: string;
  title: string;
  story: string;
  occurredOn: string;
  personIds: string[];
  photoUrl: string | null;
  photoPath: string | null;
  archivedAt: Timestamp | null;
  createdBy: string;
};

export type MemoryInput = Pick<MemoryRecord, 'title' | 'story' | 'occurredOn' | 'personIds'>;

export type MemoryPhotoInput = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export type MemoryActionResult =
  | { ok: true; memoryId: string }
  | { ok: false; message: string };

function memoryErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
      return 'LifeBook could not verify permission for this private memory.';
    }
    if (
      error.code === 'unavailable'
      || error.code === 'deadline-exceeded'
      || error.code === 'storage/retry-limit-exceeded'
    ) {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }
  return 'LifeBook could not save this memory right now. Please try again.';
}

function requireVerifiedParent() {
  const user = getFirebaseAuth()?.currentUser;
  return user?.emailVerified ? user : null;
}

function memoryFromSnapshot(id: string, data: Record<string, unknown>): MemoryRecord {
  return {
    id,
    familyId: typeof data.familyId === 'string' ? data.familyId : '',
    profileId: typeof data.profileId === 'string' ? data.profileId : '',
    title: typeof data.title === 'string' ? data.title : '',
    story: typeof data.story === 'string' ? data.story : '',
    occurredOn: typeof data.occurredOn === 'string' ? data.occurredOn : '',
    personIds: Array.isArray(data.personIds)
      ? data.personIds.filter((personId): personId is string => typeof personId === 'string')
      : [],
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    photoPath: typeof data.photoPath === 'string' ? data.photoPath : null,
    archivedAt: data.archivedAt && typeof data.archivedAt === 'object' ? data.archivedAt as Timestamp : null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  };
}

function cleanPersonIds(personIds: string[]) {
  return [...new Set(personIds.filter(Boolean))].slice(0, 20);
}

export function memoryDateLabel(occurredOn: string, format: 'long' | 'short' = 'long') {
  const [year, month, day] = occurredOn.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return occurredOn;
  }
  return new Intl.DateTimeFormat(undefined, format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { month: 'short', day: 'numeric' }).format(date);
}

export function subscribeToMemories(
  familyId: string,
  profileId: string,
  onValue: (memories: MemoryRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private memory timeline is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'families', familyId, 'memories'),
    (snapshot) => {
      const memories = snapshot.docs
        .map((memorySnapshot) => memoryFromSnapshot(memorySnapshot.id, memorySnapshot.data()))
        .filter((memory) => memory.profileId === profileId)
        .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
      onValue(memories);
    },
    (error) => onError(memoryErrorMessage(error)),
  );
}

export function subscribeToMemory(
  familyId: string,
  memoryId: string,
  onValue: (memory: MemoryRecord | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private memory timeline is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'families', familyId, 'memories', memoryId),
    (snapshot) => onValue(snapshot.exists() ? memoryFromSnapshot(snapshot.id, snapshot.data()) : null),
    (error) => onError(memoryErrorMessage(error)),
  );
}

export async function saveMemory(
  familyId: string,
  profileId: string,
  input: MemoryInput,
  memoryId?: string,
): Promise<MemoryActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update this timeline.' };
  }

  const cleanInput = {
    title: input.title.trim(),
    story: input.story.trim(),
    occurredOn: input.occurredOn.trim(),
    personIds: cleanPersonIds(input.personIds),
  };

  try {
    const memoryRef = memoryId
      ? doc(db, 'families', familyId, 'memories', memoryId)
      : doc(collection(db, 'families', familyId, 'memories'));

    if (memoryId) {
      await updateDoc(memoryRef, { ...cleanInput, updatedAt: serverTimestamp() });
    } else {
      await setDoc(memoryRef, {
        familyId,
        profileId,
        ...cleanInput,
        photoUrl: null,
        photoPath: null,
        archivedAt: null,
        createdBy: user.uid,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return { ok: true, memoryId: memoryRef.id };
  } catch (error) {
    return { ok: false, message: memoryErrorMessage(error) };
  }
}

export async function setMemoryArchived(
  familyId: string,
  memoryId: string,
  archived: boolean,
): Promise<MemoryActionResult> {
  const db = getFirebaseFirestore();
  if (!requireVerifiedParent() || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update this timeline.' };
  }

  try {
    await updateDoc(doc(db, 'families', familyId, 'memories', memoryId), {
      archivedAt: archived ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, memoryId };
  } catch (error) {
    return { ok: false, message: memoryErrorMessage(error) };
  }
}

function photoExtension(input: MemoryPhotoInput) {
  const fileExtension = input.fileName?.split('.').pop()?.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  if (fileExtension && fileExtension.length <= 5) {
    return fileExtension;
  }
  return input.mimeType?.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
}

export async function uploadMemoryPhoto(
  familyId: string,
  memoryId: string,
  input: MemoryPhotoInput,
  previousPhotoPath?: string | null,
): Promise<MemoryActionResult> {
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  if (!requireVerifiedParent() || !db || !storage) {
    return { ok: false, message: 'Photo storage is not available on this device.' };
  }

  const photoPath = `families/${familyId}/memories/${memoryId}/cover-${Date.now()}.${photoExtension(input)}`;
  const photoRef = ref(storage, photoPath);
  try {
    const response = await fetch(input.uri);
    const photoBlob = await response.blob();
    await uploadBytes(photoRef, photoBlob, { contentType: input.mimeType || photoBlob.type || 'image/jpeg' });
    const photoUrl = await getDownloadURL(photoRef);
    await updateDoc(doc(db, 'families', familyId, 'memories', memoryId), {
      photoPath,
      photoUrl,
      updatedAt: serverTimestamp(),
    });
    if (previousPhotoPath && previousPhotoPath !== photoPath) {
      await deleteObject(ref(storage, previousPhotoPath)).catch(() => undefined);
    }
    return { ok: true, memoryId };
  } catch (error) {
    await deleteObject(photoRef).catch(() => undefined);
    return { ok: false, message: memoryErrorMessage(error) };
  }
}
