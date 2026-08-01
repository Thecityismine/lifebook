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

export type ChapterIconKey = 'school' | 'sport' | 'home' | 'travel' | 'milestone' | 'other';
export type ChapterColorKey = 'violet' | 'mint' | 'sun' | 'blush' | 'sky';

export type ChapterRecord = {
  id: string;
  familyId: string;
  profileId: string;
  title: string;
  description: string;
  startsOn: string;
  endsOn: string;
  iconKey: ChapterIconKey;
  colorKey: ChapterColorKey;
  memoryIds: string[];
  archivedAt: Timestamp | null;
  createdBy: string;
};

export type ChapterInput = Pick<
  ChapterRecord,
  'title' | 'description' | 'startsOn' | 'endsOn' | 'iconKey' | 'colorKey' | 'memoryIds'
>;

export type ChapterActionResult =
  | { ok: true; chapterId: string }
  | { ok: false; message: string };

function chapterErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return 'LifeBook could not verify permission for this private chapter.';
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
  }
  return 'LifeBook could not save this chapter right now. Please try again.';
}

function requireVerifiedParent() {
  const user = getFirebaseAuth()?.currentUser;
  return user?.emailVerified ? user : null;
}

function chapterFromSnapshot(id: string, data: Record<string, unknown>): ChapterRecord {
  return {
    id,
    familyId: typeof data.familyId === 'string' ? data.familyId : '',
    profileId: typeof data.profileId === 'string' ? data.profileId : '',
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    startsOn: typeof data.startsOn === 'string' ? data.startsOn : '',
    endsOn: typeof data.endsOn === 'string' ? data.endsOn : '',
    iconKey: typeof data.iconKey === 'string' ? data.iconKey as ChapterIconKey : 'other',
    colorKey: typeof data.colorKey === 'string' ? data.colorKey as ChapterColorKey : 'violet',
    memoryIds: Array.isArray(data.memoryIds)
      ? data.memoryIds.filter((memoryId): memoryId is string => typeof memoryId === 'string')
      : [],
    archivedAt: data.archivedAt && typeof data.archivedAt === 'object' ? data.archivedAt as Timestamp : null,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
  };
}

function cleanMemoryIds(memoryIds: string[]) {
  return [...new Set(memoryIds.filter(Boolean))].slice(0, 100);
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function chapterDateRangeLabel(chapter: Pick<ChapterRecord, 'startsOn' | 'endsOn'>) {
  if (chapter.startsOn && chapter.endsOn) {
    return `${dateLabel(chapter.startsOn)} – ${dateLabel(chapter.endsOn)}`;
  }
  if (chapter.startsOn) {
    return `From ${dateLabel(chapter.startsOn)}`;
  }
  if (chapter.endsOn) {
    return `Through ${dateLabel(chapter.endsOn)}`;
  }
  return 'No dates added';
}

export function subscribeToChapters(
  familyId: string,
  profileId: string,
  onValue: (chapters: ChapterRecord[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private chapter collection is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    collection(db, 'families', familyId, 'chapters'),
    (snapshot) => {
      const chapters = snapshot.docs
        .map((chapterSnapshot) => chapterFromSnapshot(chapterSnapshot.id, chapterSnapshot.data()))
        .filter((chapter) => chapter.profileId === profileId)
        .sort((left, right) => (right.startsOn || '0000').localeCompare(left.startsOn || '0000'));
      onValue(chapters);
    },
    (error) => onError(chapterErrorMessage(error)),
  );
}

export function subscribeToChapter(
  familyId: string,
  chapterId: string,
  onValue: (chapter: ChapterRecord | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private chapter collection is not configured on this device.');
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'families', familyId, 'chapters', chapterId),
    (snapshot) => onValue(snapshot.exists() ? chapterFromSnapshot(snapshot.id, snapshot.data()) : null),
    (error) => onError(chapterErrorMessage(error)),
  );
}

export async function saveChapter(
  familyId: string,
  profileId: string,
  input: ChapterInput,
  chapterId?: string,
): Promise<ChapterActionResult> {
  const user = requireVerifiedParent();
  const db = getFirebaseFirestore();
  if (!user || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update these chapters.' };
  }

  const cleanInput = {
    title: input.title.trim(),
    description: input.description.trim(),
    startsOn: input.startsOn.trim(),
    endsOn: input.endsOn.trim(),
    iconKey: input.iconKey,
    colorKey: input.colorKey,
    memoryIds: cleanMemoryIds(input.memoryIds),
  };

  try {
    const chapterRef = chapterId
      ? doc(db, 'families', familyId, 'chapters', chapterId)
      : doc(collection(db, 'families', familyId, 'chapters'));
    if (chapterId) {
      await updateDoc(chapterRef, { ...cleanInput, updatedAt: serverTimestamp() });
    } else {
      await setDoc(chapterRef, {
        familyId,
        profileId,
        ...cleanInput,
        archivedAt: null,
        createdBy: user.uid,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return { ok: true, chapterId: chapterRef.id };
  } catch (error) {
    return { ok: false, message: chapterErrorMessage(error) };
  }
}

export async function setChapterArchived(
  familyId: string,
  chapterId: string,
  archived: boolean,
): Promise<ChapterActionResult> {
  const db = getFirebaseFirestore();
  if (!requireVerifiedParent() || !db) {
    return { ok: false, message: 'Sign in with a verified parent account to update these chapters.' };
  }

  try {
    await updateDoc(doc(db, 'families', familyId, 'chapters', chapterId), {
      archivedAt: archived ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, chapterId };
  } catch (error) {
    return { ok: false, message: chapterErrorMessage(error) };
  }
}
