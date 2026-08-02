import { FirebaseError } from 'firebase/app';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Platform, Share } from 'react-native';

import { getFirebaseFirestore, getFirebaseFunctions } from '@/services/firebase';

export type CollaborationRole = 'owner' | 'guardian' | 'member';
export type InviteRole = Exclude<CollaborationRole, 'owner'>;

export type FamilyMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: CollaborationRole;
  joinedAt: Timestamp | null;
};

export type FamilyInvite = {
  id: string;
  email: string;
  role: InviteRole;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
};

export type InvitePreview = {
  familyId: string;
  familyName: string;
  role: InviteRole;
  email: string;
  expiresAt: number;
};

type ActionResult<T extends object = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

const PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  || 'https://lifebook-smoky.vercel.app';

function collaborationError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'functions/unauthenticated') return 'Sign in again before managing family access.';
    if (error.code === 'functions/permission-denied') return error.message || 'This account cannot make that change.';
    if (error.code === 'functions/not-found') return error.message || 'That invitation is no longer available.';
    if (error.code === 'functions/unavailable' || error.code === 'functions/deadline-exceeded') {
      return 'LifeBook could not reach the private family service. Check your connection and try again.';
    }
    if (error.message) return error.message;
  }
  return 'LifeBook could not update family access right now. Please try again.';
}

async function callCollaboration<Input, Output extends object>(
  name: string,
  input: Input,
): Promise<ActionResult<Output>> {
  const functions = getFirebaseFunctions();
  if (!functions) return { ok: false, message: 'The private family service is not configured.' };
  try {
    const response = await httpsCallable<Input, { ok: true } & Output>(functions, name)(input);
    return response.data;
  } catch (error) {
    return { ok: false, message: collaborationError(error) };
  }
}

export function subscribeToFamilyMembers(
  familyId: string,
  onValue: (members: FamilyMember[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private family service is not configured.');
    return () => undefined;
  }
  return onSnapshot(
    query(collection(db, 'families', familyId, 'members'), orderBy('joinedAt', 'asc')),
    (snapshot) => onValue(snapshot.docs.map((item) => {
      const data = item.data();
      const role = data.role === 'owner' || data.role === 'guardian' ? data.role : 'member';
      return {
        id: item.id,
        userId: typeof data.userId === 'string' ? data.userId : item.id,
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Family member',
        email: typeof data.email === 'string' ? data.email : '',
        role,
        joinedAt: data.joinedAt || null,
      };
    })),
    (error) => onError(collaborationError(error)),
  );
}

export function subscribeToFamilyInvites(
  familyId: string,
  onValue: (invites: FamilyInvite[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  if (!db) {
    onError('The private family service is not configured.');
    return () => undefined;
  }
  return onSnapshot(
    query(collection(db, 'families', familyId, 'invites'), orderBy('createdAt', 'desc')),
    (snapshot) => onValue(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        email: typeof data.email === 'string' ? data.email : '',
        role: data.role === 'guardian' ? 'guardian' : 'member',
        status: data.status === 'accepted' || data.status === 'revoked' ? data.status : 'pending',
        createdAt: data.createdAt || null,
        expiresAt: data.expiresAt || null,
      };
    })),
    (error) => onError(collaborationError(error)),
  );
}

export function createFamilyInvite(familyId: string, email: string, role: InviteRole) {
  return callCollaboration<
    { familyId: string; email: string; role: InviteRole },
    { inviteId: string; token: string; expiresAt: number }
  >('createFamilyInvite', { familyId, email: email.trim(), role });
}

export function previewFamilyInvite(token: string) {
  return callCollaboration<{ token: string }, InvitePreview>('previewFamilyInvite', { token });
}

export function acceptFamilyInvite(token: string, guardianConfirmed: boolean) {
  return callCollaboration<
    { token: string; guardianConfirmed: boolean },
    { familyId: string; activeProfileId: string }
  >('acceptFamilyInvite', { token, guardianConfirmed });
}

export function revokeFamilyInvite(familyId: string, inviteId: string) {
  return callCollaboration('revokeFamilyInvite', { familyId, inviteId });
}

export function updateFamilyMemberRole(familyId: string, targetUserId: string, role: InviteRole) {
  return callCollaboration('updateFamilyMemberRole', { familyId, targetUserId, role });
}

export function removeFamilyMember(familyId: string, targetUserId: string) {
  return callCollaboration('removeFamilyMember', { familyId, targetUserId });
}

export function transferFamilyOwnership(familyId: string, targetUserId: string) {
  return callCollaboration<{ familyId: string; targetUserId: string }, { newOwnerId: string }>(
    'transferFamilyOwnership',
    { familyId, targetUserId },
  );
}

export function familyInviteUrl(token: string) {
  return `${PUBLIC_APP_URL}/join-family?token=${encodeURIComponent(token)}`;
}

export async function shareFamilyInvite(url: string): Promise<ActionResult<{ copied: boolean }>> {
  try {
    if (Platform.OS === 'web' && globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(url);
      return { ok: true, copied: true };
    }
    await Share.share({
      title: 'Join my private LifeBook family',
      message: `You have been invited to a private LifeBook family. This link expires in seven days: ${url}`,
      url,
    });
    return { ok: true, copied: false };
  } catch (error) {
    return { ok: false, message: collaborationError(error) };
  }
}
