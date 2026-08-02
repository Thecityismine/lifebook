import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from '@/services/firebase';

export const STANDARD_PERSON_TAGS = ['Family', 'Friend', 'School', 'Team'] as const;

export type PersonRecord = {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  birthday: string;
  phoneNumber: string;
  address: string;
  notes: string;
  tags: string[];
  photoUrl: string | null;
  photoPath: string | null;
  archivedAt: Timestamp | null;
  createdBy: string;
};

export type PersonInput = Pick<
  PersonRecord,
  'firstName' | 'lastName' | 'nickname' | 'birthday' | 'phoneNumber' | 'address' | 'notes' | 'tags'
>;

export type ManagedProfileSummary = {
  id: string;
  firstName: string;
  relationship: string;
};

export type ProfileRelationship = {
  profileId: string;
  personId: string;
  familyId: string;
  relationshipLabel: string;
  notes: string;
};

export type RelationshipInput = Pick<ProfileRelationship, 'relationshipLabel' | 'notes'>;

export type PeopleActionResult =
  | { ok: true; personId: string; photoWarning?: string }
  | { ok: false; message: string };

type PersonPhotoInput = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

function peopleErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
      return 'LifeBook could not verify permission for this family directory.';
    }

    if (
      error.code === 'unavailable'
      || error.code === 'deadline-exceeded'
      || error.code === 'storage/retry-limit-exceeded'
    ) {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }

  return 'LifeBook could not save this person right now. Please try again.';
}

function requireVerifiedParent() {
  const user = getFirebaseAuth()?.currentUser;
  return user?.emailVerified ? user : null;
}

function cleanTags(tags: string[]) {
  const seen = new Set<string>();

  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || tag.length > 30 || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function personFromSnapshot(id: string, data: Record<string, unknown>): PersonRecord {
  return {
    id,
    familyId: typeof data.familyId === 'string' ? data.familyId : '',
    firstName: typeof data.firstName === 'string' ? data.firstName : '',
    lastName: typeof data.lastName === 'string' ? data.lastName : '',
    nickname: typeof data.nickname === 'string' ? data.nickname : '',
    birthday: typeof data.birthday === 'string' ? data.birthday : '',
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    address: typeof data.address === 'string' ? data.address : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
    photoPath: typeof data.photoPath === 'string' ? data.photoPath : null,
    archivedAt: data.archivedAt && typeof data.archivedAt === 'object' ? data.archivedAt as Timestamp : null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  };
}

export function personDisplayName(person: Pick<PersonRecord, 'firstName' | 'lastName'>) {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function personInitials(person: Pick<PersonRecord, 'firstName' | 'lastName'>) {
  return [person.firstName, person.lastName]
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

export function subscribeToPeople(
  familyId: string,
  onValue: (people: PersonRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private family directory is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'families', familyId, 'people'),
    (snapshot) => {
      const nextPeople = snapshot.docs
        .map((personSnapshot) => personFromSnapshot(personSnapshot.id, personSnapshot.data()))
        .sort((left, right) => personDisplayName(left).localeCompare(personDisplayName(right)));
      onValue(nextPeople);
    },
    (error) => onError(peopleErrorMessage(error)),
  );
}

export function subscribeToPerson(
  familyId: string,
  personId: string,
  onValue: (person: PersonRecord | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private family directory is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'families', familyId, 'people', personId),
    (snapshot) => onValue(snapshot.exists() ? personFromSnapshot(snapshot.id, snapshot.data()) : null),
    (error) => onError(peopleErrorMessage(error)),
  );
}

export function subscribeToManagedProfiles(
  familyId: string,
  onValue: (profiles: ManagedProfileSummary[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('Managed profiles are not available right now.');
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'families', familyId, 'profiles'),
    (snapshot) => onValue(snapshot.docs.map((profileSnapshot) => {
      const data = profileSnapshot.data();
      return {
        id: profileSnapshot.id,
        firstName: typeof data.firstName === 'string' ? data.firstName : 'Profile',
        relationship: typeof data.relationship === 'string' ? data.relationship : 'Managed profile',
      };
    })),
    (error) => onError(peopleErrorMessage(error)),
  );
}

export function subscribeToRelationships(
  familyId: string,
  personId: string,
  onValue: (relationships: ProfileRelationship[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('Relationship details are not available right now.');
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'families', familyId, 'people', personId, 'relationships'),
    (snapshot) => onValue(snapshot.docs.map((relationshipSnapshot) => {
      const data = relationshipSnapshot.data();
      return {
        profileId: relationshipSnapshot.id,
        personId: typeof data.personId === 'string' ? data.personId : personId,
        familyId: typeof data.familyId === 'string' ? data.familyId : familyId,
        relationshipLabel: typeof data.relationshipLabel === 'string' ? data.relationshipLabel : '',
        notes: typeof data.notes === 'string' ? data.notes : '',
      };
    })),
    (error) => onError(peopleErrorMessage(error)),
  );
}

export async function savePerson(
  familyId: string,
  input: PersonInput,
  personId?: string,
): Promise<PeopleActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update this directory.' };
  }

  const cleanInput = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    nickname: input.nickname.trim(),
    birthday: input.birthday.trim(),
    phoneNumber: input.phoneNumber.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    tags: cleanTags(input.tags),
  };

  try {
    const personRef = personId
      ? doc(db, 'families', familyId, 'people', personId)
      : doc(collection(db, 'families', familyId, 'people'));

    if (personId) {
      await updateDoc(personRef, { ...cleanInput, updatedAt: serverTimestamp() });
    } else {
      await setDoc(personRef, {
        familyId,
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

    return { ok: true, personId: personRef.id };
  } catch (error) {
    return { ok: false, message: peopleErrorMessage(error) };
  }
}

export async function saveProfileRelationship(
  familyId: string,
  personId: string,
  profileId: string,
  input: RelationshipInput,
): Promise<PeopleActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update this relationship.' };
  }

  try {
    const relationshipRef = doc(db, 'families', familyId, 'people', personId, 'relationships', profileId);
    const existingRelationship = await getDoc(relationshipRef);
    const cleanInput = {
      relationshipLabel: input.relationshipLabel.trim(),
      notes: input.notes.trim(),
      updatedAt: serverTimestamp(),
    };

    if (existingRelationship.exists()) {
      await updateDoc(relationshipRef, cleanInput);
    } else {
      await setDoc(relationshipRef, {
        familyId,
        personId,
        profileId,
        ...cleanInput,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    return { ok: true, personId };
  } catch (error) {
    return { ok: false, message: peopleErrorMessage(error) };
  }
}

export async function setPersonArchived(
  familyId: string,
  personId: string,
  archived: boolean,
): Promise<PeopleActionResult> {
  const db = getFirebaseFirestore();
  if (!requireVerifiedParent() || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update this directory.' };
  }

  try {
    await updateDoc(doc(db, 'families', familyId, 'people', personId), {
      archivedAt: archived ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, personId };
  } catch (error) {
    return { ok: false, message: peopleErrorMessage(error) };
  }
}

function photoExtension(input: PersonPhotoInput) {
  const fileExtension = input.fileName?.split('.').pop()?.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
  if (fileExtension && fileExtension.length <= 5) {
    return fileExtension;
  }

  return input.mimeType?.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
}

export async function uploadPersonPhoto(
  familyId: string,
  personId: string,
  input: PersonPhotoInput,
  previousPhotoPath?: string | null,
): Promise<PeopleActionResult> {
  const db = getFirebaseFirestore();
  const storage = getFirebaseStorage();
  if (!requireVerifiedParent() || !db || !storage) {
    return { ok: false, message: 'Photo storage is not available on this device.' };
  }

  const photoPath = `families/${familyId}/people/${personId}/profile-${Date.now()}.${photoExtension(input)}`;
  const photoRef = ref(storage, photoPath);

  try {
    const response = await fetch(input.uri);
    const photoBlob = await response.blob();
    await uploadBytes(photoRef, photoBlob, { contentType: input.mimeType || photoBlob.type || 'image/jpeg' });
    const photoUrl = await getDownloadURL(photoRef);
    await updateDoc(doc(db, 'families', familyId, 'people', personId), {
      photoPath,
      photoUrl,
      updatedAt: serverTimestamp(),
    });

    if (previousPhotoPath && previousPhotoPath !== photoPath) {
      await deleteObject(ref(storage, previousPhotoPath)).catch(() => undefined);
    }

    return { ok: true, personId };
  } catch (error) {
    await deleteObject(photoRef).catch(() => undefined);
    return { ok: false, message: peopleErrorMessage(error) };
  }
}
