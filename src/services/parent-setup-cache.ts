import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseCompletedSetup,
  serializeCompletedSetup,
  type ParentSetupState,
} from '@/services/auth-flow-policy';

const SETUP_CACHE_PREFIX = 'lifebook:parent-setup:v1:';

function cacheKey(userId: string) {
  return `${SETUP_CACHE_PREFIX}${userId}`;
}

export async function readCachedParentSetup(userId: string): Promise<ParentSetupState | null> {
  try {
    return parseCompletedSetup(await AsyncStorage.getItem(cacheKey(userId)));
  } catch {
    return null;
  }
}

export async function writeCachedParentSetup(userId: string, setup: ParentSetupState | null): Promise<void> {
  try {
    const value = serializeCompletedSetup(setup);
    if (value) {
      await AsyncStorage.setItem(cacheKey(userId), value);
    } else {
      await AsyncStorage.removeItem(cacheKey(userId));
    }
  } catch {
    // Persistence is a startup optimization. Firestore remains authoritative.
  }
}
