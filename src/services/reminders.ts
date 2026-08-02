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

import { getFirebaseAuth, getFirebaseFirestore } from '@/services/firebase';

export type ReminderKind = 'birthday' | 'appointment' | 'school' | 'activity' | 'milestone' | 'other';

export type ReminderRecord = {
  id: string;
  familyId: string;
  profileId: string;
  title: string;
  notes: string;
  dueOn: string;
  timeOfDay: string;
  kind: ReminderKind;
  personId: string;
  completedAt: Timestamp | null;
  archivedAt: Timestamp | null;
  createdBy: string;
};

export type ReminderInput = Pick<ReminderRecord, 'title' | 'notes' | 'dueOn' | 'timeOfDay' | 'kind' | 'personId'>;

export type ReminderActionResult =
  | { ok: true; reminderId: string }
  | { ok: false; message: string };

function reminderErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'LifeBook could not verify permission for this private reminder.';
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }
  return 'LifeBook could not save this reminder right now. Please try again.';
}

function requireVerifiedParent() {
  const user = getFirebaseAuth()?.currentUser;
  return user?.emailVerified ? user : null;
}

function reminderFromSnapshot(id: string, data: Record<string, unknown>): ReminderRecord {
  return {
    id,
    familyId: typeof data.familyId === 'string' ? data.familyId : '',
    profileId: typeof data.profileId === 'string' ? data.profileId : '',
    title: typeof data.title === 'string' ? data.title : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    dueOn: typeof data.dueOn === 'string' ? data.dueOn : '',
    timeOfDay: typeof data.timeOfDay === 'string' ? data.timeOfDay : '',
    kind: typeof data.kind === 'string' ? data.kind as ReminderKind : 'other',
    personId: typeof data.personId === 'string' ? data.personId : '',
    completedAt: data.completedAt && typeof data.completedAt === 'object' ? data.completedAt as Timestamp : null,
    archivedAt: data.archivedAt && typeof data.archivedAt === 'object' ? data.archivedAt as Timestamp : null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  };
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3]) ? date : null;
}

export function validReminderDate(value: string) {
  return parseLocalDate(value) !== null;
}

export function validReminderTime(value: string) {
  return value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function reminderDateLabel(dueOn: string, timeOfDay = '') {
  const date = parseLocalDate(dueOn);
  if (!date) return dueOn;
  const dateText = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  if (!timeOfDay) return dateText;
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const time = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  return `${dateText} at ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(time)}`;
}

export function reminderRelativeLabel(dueOn: string, timeOfDay = '', now = new Date()) {
  const date = parseLocalDate(dueOn);
  if (!date) return reminderDateLabel(dueOn, timeOfDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const difference = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const relative = difference === 0 ? 'Today'
    : difference === 1 ? 'Tomorrow'
      : difference === -1 ? 'Yesterday'
        : difference > 1 ? `In ${difference} days` : `${Math.abs(difference)} days overdue`;
  const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  if (!timeOfDay) return `${relative} · ${shortDate}`;
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const time = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  return `${relative} · ${shortDate} at ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(time)}`;
}

export function subscribeToReminders(
  familyId: string,
  profileId: string,
  onValue: (reminders: ReminderRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private reminder collection is not configured on this device.');
    return () => undefined;
  }
  return onSnapshot(
    collection(db, 'families', familyId, 'reminders'),
    (snapshot) => onValue(snapshot.docs
      .map((item) => reminderFromSnapshot(item.id, item.data()))
      .filter((item) => item.profileId === profileId)
      .sort((left, right) => `${left.dueOn}T${left.timeOfDay || '23:59'}`.localeCompare(`${right.dueOn}T${right.timeOfDay || '23:59'}`))),
    (error) => onError(reminderErrorMessage(error)),
  );
}

export function subscribeToReminder(
  familyId: string,
  reminderId: string,
  onValue: (reminder: ReminderRecord | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private reminder collection is not configured on this device.');
    return () => undefined;
  }
  return onSnapshot(
    doc(db, 'families', familyId, 'reminders', reminderId),
    (snapshot) => onValue(snapshot.exists() ? reminderFromSnapshot(snapshot.id, snapshot.data()) : null),
    (error) => onError(reminderErrorMessage(error)),
  );
}

export async function saveReminder(
  familyId: string,
  profileId: string,
  input: ReminderInput,
  reminderId?: string,
): Promise<ReminderActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update these reminders.' };
  }
  const cleanInput = {
    title: input.title.trim(), notes: input.notes.trim(), dueOn: input.dueOn.trim(),
    timeOfDay: input.timeOfDay.trim(), kind: input.kind, personId: input.personId.trim(),
  };
  try {
    const reminderRef = reminderId
      ? doc(db, 'families', familyId, 'reminders', reminderId)
      : doc(collection(db, 'families', familyId, 'reminders'));
    if (reminderId) {
      await updateDoc(reminderRef, { ...cleanInput, updatedAt: serverTimestamp() });
    } else {
      await setDoc(reminderRef, {
        familyId, profileId, ...cleanInput, completedAt: null, archivedAt: null,
        createdBy: user.uid, schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
    return { ok: true, reminderId: reminderRef.id };
  } catch (error) {
    return { ok: false, message: reminderErrorMessage(error) };
  }
}

async function updateReminderState(familyId: string, reminderId: string, values: Record<string, unknown>): Promise<ReminderActionResult> {
  const db = getFirebaseFirestore();
  if (!requireVerifiedParent() || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update these reminders.' };
  }
  try {
    await updateDoc(doc(db, 'families', familyId, 'reminders', reminderId), { ...values, updatedAt: serverTimestamp() });
    return { ok: true, reminderId };
  } catch (error) {
    return { ok: false, message: reminderErrorMessage(error) };
  }
}

export function setReminderCompleted(familyId: string, reminderId: string, completed: boolean) {
  return updateReminderState(familyId, reminderId, { completedAt: completed ? serverTimestamp() : null });
}

export function setReminderArchived(familyId: string, reminderId: string, archived: boolean) {
  return updateReminderState(familyId, reminderId, { archivedAt: archived ? serverTimestamp() : null });
}
