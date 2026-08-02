import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'lifebook-31782';
const ownerId = 'owner-a';
const outsiderId = 'owner-b';
const guardianId = 'guardian-a';
const familyId = 'family-a';
const outsiderFamilyId = 'family-b';
const profileId = 'profile-a';
const personId = 'person-a';
const memoryId = 'memory-a';
const chapterId = 'chapter-a';
const reminderId = 'reminder-a';
let testEnvironment;

function personData() {
  return {
    familyId,
    firstName: 'Jordan',
    lastName: 'Lee',
    nickname: 'Jordy',
    birthday: '2015-04-12',
    notes: 'Met through school.',
    tags: ['Friend', 'School'],
    photoUrl: null,
    photoPath: null,
    archivedAt: null,
    createdBy: ownerId,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function memoryData() {
  return {
    familyId,
    profileId,
    title: 'The science fair',
    story: 'Built a solar system together.',
    occurredOn: '2026-05-20',
    personIds: [personId],
    photoUrl: null,
    photoPath: null,
    archivedAt: null,
    createdBy: ownerId,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function chapterData() {
  return {
    familyId,
    profileId,
    title: 'Fifth grade',
    description: 'A year of new friends and big changes.',
    startsOn: '2026-08-20',
    endsOn: '2027-06-10',
    iconKey: 'school',
    colorKey: 'violet',
    memoryIds: [memoryId],
    archivedAt: null,
    createdBy: ownerId,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function reminderData() {
  return {
    familyId,
    profileId,
    title: 'Dentist appointment',
    notes: 'Bring the insurance card.',
    dueOn: '2026-08-12',
    timeOfDay: '15:30',
    kind: 'appointment',
    personId,
    completedAt: null,
    archivedAt: null,
    createdBy: ownerId,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function privacySettingsData(guardianCanEdit = false) {
  return {
    familyId,
    defaultVisibility: 'family',
    guardianCanEdit,
    updatedBy: ownerId,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await Promise.all([testEnvironment.clearFirestore(), testEnvironment.clearStorage()]);
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'families', familyId), {
        name: 'Family A', ownerId, schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(),
      }),
      setDoc(doc(db, 'families', familyId, 'members', ownerId), {
        userId: ownerId, role: 'owner', displayName: 'Owner A', email: 'owner-a@example.com', joinedAt: new Date(),
      }),
      setDoc(doc(db, 'families', familyId, 'members', guardianId), {
        userId: guardianId, role: 'guardian', displayName: 'Guardian A', email: 'guardian-a@example.com', joinedAt: new Date(),
      }),
      setDoc(doc(db, 'families', familyId, 'profiles', profileId), {
        familyId, firstName: 'Sam', relationship: 'My child', managed: true,
        createdBy: ownerId, createdAt: new Date(), updatedAt: new Date(),
      }),
      setDoc(doc(db, 'families', outsiderFamilyId), {
        name: 'Family B', ownerId: outsiderId, schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(),
      }),
      setDoc(doc(db, 'families', outsiderFamilyId, 'members', outsiderId), {
        userId: outsiderId, role: 'owner', displayName: 'Owner B', email: 'owner-b@example.com', joinedAt: new Date(),
      }),
    ]);
  });
});

after(async () => {
  await testEnvironment.cleanup();
});

test('owner can create, read, archive, and restore a family person', async () => {
  const db = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const personRef = doc(db, 'families', familyId, 'people', personId);

  await assertSucceeds(setDoc(personRef, personData()));
  await assertSucceeds(getDoc(personRef));
  await assertSucceeds(updateDoc(personRef, { archivedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(personRef, { archivedAt: null, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(personRef));
});

test('owner can save a relationship only for a managed profile in the same family', async () => {
  const db = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  await assertSucceeds(setDoc(doc(db, 'families', familyId, 'people', personId), personData()));

  await assertSucceeds(setDoc(doc(db, 'families', familyId, 'people', personId, 'relationships', profileId), {
    familyId,
    personId,
    profileId,
    relationshipLabel: 'Best friend',
    notes: 'They met in first grade.',
    createdBy: ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  await assertFails(setDoc(doc(db, 'families', familyId, 'people', personId, 'relationships', 'missing-profile'), {
    familyId,
    personId,
    profileId: 'missing-profile',
    relationshipLabel: 'Friend',
    notes: '',
    createdBy: ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
});

test('a verified parent outside the family cannot read or write People data', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  await assertSucceeds(setDoc(doc(ownerDb, 'families', familyId, 'people', personId), personData()));

  const outsiderDb = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(outsiderDb, 'families', familyId, 'people', personId)));
  await assertFails(setDoc(doc(outsiderDb, 'families', familyId, 'people', 'intruder-person'), {
    ...personData(),
    createdBy: outsiderId,
  }));
});

test('photo storage accepts family images and denies invalid or cross-family access', async () => {
  const ownerStorage = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).storage('gs://lifebook-31782.firebasestorage.app');
  const photoRef = ownerStorage.ref(`families/${familyId}/people/${personId}/profile.jpg`);

  await assertSucceeds(photoRef.putString('private photo', 'raw', { contentType: 'image/jpeg' }));
  await assertSucceeds(photoRef.getMetadata());
  await assertFails(ownerStorage.ref(`families/${familyId}/people/${personId}/notes.txt`)
    .putString('not an image', 'raw', { contentType: 'text/plain' }));

  const outsiderStorage = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  }).storage('gs://lifebook-31782.firebasestorage.app');
  await assertFails(outsiderStorage.ref(photoRef.fullPath).getMetadata());
  await assertFails(outsiderStorage.ref(`families/${familyId}/people/${personId}/intruder.jpg`)
    .putString('intruder photo', 'raw', { contentType: 'image/jpeg' }));
});

test('owner can create, read, edit, archive, and restore a profile memory', async () => {
  const db = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const memoryRef = doc(db, 'families', familyId, 'memories', memoryId);

  await assertSucceeds(setDoc(memoryRef, memoryData()));
  await assertSucceeds(getDoc(memoryRef));
  await assertSucceeds(updateDoc(memoryRef, {
    title: 'Our science fair',
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(memoryRef, { archivedAt: null, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(memoryRef, { profileId: 'another-profile', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(memoryRef));
});

test('memory records and images deny invalid or cross-family access', async () => {
  const ownerContext = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  });
  const ownerDb = ownerContext.firestore();
  await assertSucceeds(setDoc(doc(ownerDb, 'families', familyId, 'memories', memoryId), memoryData()));
  await assertFails(setDoc(doc(ownerDb, 'families', familyId, 'memories', 'missing-profile'), {
    ...memoryData(),
    profileId: 'missing-profile',
  }));

  const ownerStorage = ownerContext.storage('gs://lifebook-31782.firebasestorage.app');
  const imageRef = ownerStorage.ref(`families/${familyId}/memories/${memoryId}/cover.jpg`);
  await assertSucceeds(imageRef.putString('private memory image', 'raw', { contentType: 'image/jpeg' }));
  await assertSucceeds(imageRef.getMetadata());
  await assertFails(ownerStorage.ref(`families/${familyId}/memories/${memoryId}/notes.txt`)
    .putString('not an image', 'raw', { contentType: 'text/plain' }));

  const outsiderContext = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  });
  await assertFails(getDoc(doc(outsiderContext.firestore(), 'families', familyId, 'memories', memoryId)));
  await assertFails(outsiderContext.storage('gs://lifebook-31782.firebasestorage.app')
    .ref(imageRef.fullPath).getMetadata());
});

test('owner can create, read, edit, archive, and restore a profile chapter', async () => {
  const db = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const chapterRef = doc(db, 'families', familyId, 'chapters', chapterId);

  await assertSucceeds(setDoc(chapterRef, chapterData()));
  await assertSucceeds(getDoc(chapterRef));
  await assertSucceeds(updateDoc(chapterRef, {
    title: 'Our fifth-grade year',
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(chapterRef, { archivedAt: null, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(chapterRef, { profileId: 'another-profile', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(chapterRef));
});

test('chapter records deny invalid-profile and cross-family access', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  await assertSucceeds(setDoc(doc(ownerDb, 'families', familyId, 'chapters', chapterId), chapterData()));
  await assertFails(setDoc(doc(ownerDb, 'families', familyId, 'chapters', 'missing-profile'), {
    ...chapterData(),
    profileId: 'missing-profile',
  }));

  const outsiderDb = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(outsiderDb, 'families', familyId, 'chapters', chapterId)));
  await assertFails(setDoc(doc(outsiderDb, 'families', familyId, 'chapters', 'intruder-chapter'), {
    ...chapterData(),
    createdBy: outsiderId,
  }));
});

test('owner can create, read, edit, complete, archive, and restore a profile reminder', async () => {
  const db = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const reminderRef = doc(db, 'families', familyId, 'reminders', reminderId);

  await assertSucceeds(setDoc(doc(db, 'families', familyId, 'people', personId), personData()));
  await assertSucceeds(setDoc(reminderRef, reminderData()));
  await assertSucceeds(getDoc(reminderRef));
  await assertSucceeds(updateDoc(reminderRef, {
    title: 'Our dentist appointment', completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(reminderRef, {
    completedAt: null, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(updateDoc(reminderRef, { archivedAt: null, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(reminderRef, { profileId: 'another-profile', updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(reminderRef));
});

test('reminder records deny invalid-profile and cross-family access', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  await assertSucceeds(setDoc(doc(ownerDb, 'families', familyId, 'people', personId), personData()));
  await assertSucceeds(setDoc(doc(ownerDb, 'families', familyId, 'reminders', reminderId), reminderData()));
  await assertFails(setDoc(doc(ownerDb, 'families', familyId, 'reminders', 'missing-profile'), {
    ...reminderData(), profileId: 'missing-profile',
  }));
  await assertFails(setDoc(doc(ownerDb, 'families', familyId, 'reminders', 'missing-person'), {
    ...reminderData(), personId: 'missing-person',
  }));

  const outsiderDb = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(outsiderDb, 'families', familyId, 'reminders', reminderId)));
  await assertFails(setDoc(doc(outsiderDb, 'families', familyId, 'reminders', 'intruder-reminder'), {
    ...reminderData(), createdBy: outsiderId,
  }));
});

test('owner can manage family privacy settings and create immutable audit events', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const settingsRef = doc(ownerDb, 'families', familyId, 'settings', 'privacy');
  const auditRef = doc(ownerDb, 'families', familyId, 'auditEvents', 'privacy-event-a');

  await assertSucceeds(setDoc(settingsRef, privacySettingsData(false)));
  await assertSucceeds(getDoc(settingsRef));
  await assertSucceeds(updateDoc(settingsRef, {
    guardianCanEdit: true, updatedBy: ownerId, updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(auditRef, {
    familyId,
    eventType: 'privacy_settings_updated',
    actorId: ownerId,
    summary: 'Guardian editing enabled.',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(auditRef, { summary: 'Changed later.' }));
  await assertFails(deleteDoc(settingsRef));
  await assertFails(deleteDoc(auditRef));
});

test('privacy settings enforce guardian editing and deny cross-family control', async () => {
  const ownerDb = testEnvironment.authenticatedContext(ownerId, {
    email: 'owner-a@example.com', email_verified: true,
  }).firestore();
  const settingsRef = doc(ownerDb, 'families', familyId, 'settings', 'privacy');
  await assertSucceeds(setDoc(settingsRef, privacySettingsData(false)));

  const guardianDb = testEnvironment.authenticatedContext(guardianId, {
    email: 'guardian-a@example.com', email_verified: true,
  }).firestore();
  await assertSucceeds(getDoc(doc(guardianDb, 'families', familyId, 'settings', 'privacy')));
  await assertFails(setDoc(doc(guardianDb, 'families', familyId, 'people', 'guardian-person-a'), {
    ...personData(), createdBy: guardianId,
  }));
  await assertFails(updateDoc(doc(guardianDb, 'families', familyId, 'settings', 'privacy'), {
    guardianCanEdit: true, updatedBy: guardianId, updatedAt: serverTimestamp(),
  }));

  await assertSucceeds(updateDoc(settingsRef, {
    guardianCanEdit: true, updatedBy: ownerId, updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(doc(guardianDb, 'families', familyId, 'people', 'guardian-person-b'), {
    ...personData(), createdBy: guardianId,
  }));

  const outsiderDb = testEnvironment.authenticatedContext(outsiderId, {
    email: 'owner-b@example.com', email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(outsiderDb, 'families', familyId, 'settings', 'privacy')));
});
