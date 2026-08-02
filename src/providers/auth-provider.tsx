import type { User } from 'firebase/auth';
import { onIdTokenChanged, reload } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';
import { loadParentSetup, subscribeToParentSetup, type ParentSetup } from '@/services/family';
import {
  authSetupIdentity,
  reconcileConfirmedSetup,
  shouldRestartSetupSubscription,
  type AuthSetupIdentity,
} from '@/services/auth-flow-policy';
import { readCachedParentSetup, writeCachedParentSetup } from '@/services/parent-setup-cache';

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  setup: ParentSetup | null;
  setupLoading: boolean;
  setupError: boolean;
  refreshUser: () => Promise<void>;
  refreshSetup: () => void;
  confirmFamilyCreated: (familyId: string) => void;
  confirmManagedProfileCreated: (familyId: string, profileId: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SETUP_FALLBACK_DELAY_MS = 1500;
const SETUP_LOAD_DEADLINE_MS = 12000;

export function AuthProvider({ children }: PropsWithChildren) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(auth !== null);
  const [setup, setSetup] = useState<ParentSetup | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState(false);
  const setupUnsubscribe = useRef<(() => void) | null>(null);
  const setupIdentity = useRef<AuthSetupIdentity>(authSetupIdentity(null));
  const setupConfirmation = useRef<ParentSetup | null>(null);
  const setupSubscriptionRevision = useRef(0);
  const [, setRevision] = useState(0);

  const subscribeToSetup = useCallback((userId: string, useCachedSetup: boolean) => {
    setupUnsubscribe.current?.();
    const revision = ++setupSubscriptionRevision.current;
    let observedLiveSetup = false;
    let initialSetupResolved = false;
    let fallbackStarted = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeLiveSetup: () => void = () => undefined;

    const isCurrentSubscription = () => revision === setupSubscriptionRevision.current;
    const clearInitialTimers = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
        deadlineTimer = null;
      }
    };

    const applySetup = (nextSetup: ParentSetup | null, source: 'cache' | 'firestore' | 'function') => {
      if (!isCurrentSubscription()) {
        return;
      }

      const wasInitialResolution = !initialSetupResolved;
      initialSetupResolved = true;
      clearInitialTimers();
      const reconciliation = reconcileConfirmedSetup(nextSetup, setupConfirmation.current);
      setupConfirmation.current = reconciliation.pendingConfirmation;
      setSetup(reconciliation.setup);
      setSetupError(false);
      setSetupLoading(false);
      void writeCachedParentSetup(userId, reconciliation.setup);

      if (wasInitialResolution) {
        console.info('[auth-setup] Parent setup resolved.', {
          source,
          found: reconciliation.setup !== null,
          complete: reconciliation.setup?.onboardingComplete === true,
        });
      }
    };

    const resolveWithFunction = async (trigger: string) => {
      if (!isCurrentSubscription() || initialSetupResolved || fallbackStarted) {
        return;
      }

      fallbackStarted = true;
      console.warn('[auth-setup] Using HTTPS setup fallback.', { trigger });
      const result = await loadParentSetup();
      if (!isCurrentSubscription() || initialSetupResolved) {
        return;
      }
      if (result.ok) {
        applySetup(result.setup, 'function');
        return;
      }
      console.warn('[auth-setup] HTTPS setup fallback failed.', { code: result.code });
    };

    fallbackTimer = setTimeout(() => {
      void resolveWithFunction('firestore-timeout');
    }, SETUP_FALLBACK_DELAY_MS);
    deadlineTimer = setTimeout(() => {
      if (!isCurrentSubscription() || initialSetupResolved) {
        return;
      }
      console.warn('[auth-setup] Parent setup load deadline exceeded.');
      setSetupError(true);
      setSetupLoading(false);
    }, SETUP_LOAD_DEADLINE_MS);

    if (useCachedSetup) {
      void readCachedParentSetup(userId).then((cachedSetup) => {
        if (!isCurrentSubscription() || observedLiveSetup || initialSetupResolved || !cachedSetup) {
          return;
        }
        applySetup(cachedSetup, 'cache');
      });
    }

    unsubscribeLiveSetup = subscribeToParentSetup(
      userId,
      (nextSetup) => {
        if (!isCurrentSubscription()) {
          return;
        }
        observedLiveSetup = true;
        applySetup(nextSetup, 'firestore');
      },
      (code) => {
        if (!isCurrentSubscription()) {
          return;
        }
        console.warn('[auth-setup] Firestore setup listener failed.', { code });
        void resolveWithFunction(code);
      },
    );

    setupUnsubscribe.current = () => {
      clearInitialTimers();
      unsubscribeLiveSetup();
    };
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      const nextSetupIdentity = authSetupIdentity(nextUser);
      const shouldRestartSetup = shouldRestartSetupSubscription(setupIdentity.current, nextSetupIdentity);

      setUser(nextUser);

      if (!shouldRestartSetup) {
        setInitializing(false);
        return;
      }

      setupUnsubscribe.current?.();
      setupUnsubscribe.current = null;
      setupSubscriptionRevision.current += 1;
      setupIdentity.current = nextSetupIdentity;
      setupConfirmation.current = null;
      setSetup(null);
      setSetupError(false);

      if (nextUser?.emailVerified) {
        setSetupLoading(true);
        subscribeToSetup(nextUser.uid, true);
      } else {
        setSetupLoading(false);
      }

      setInitializing(false);
    });

    return () => {
      setupSubscriptionRevision.current += 1;
      setupUnsubscribe.current?.();
      unsubscribe();
    };
  }, [auth, subscribeToSetup]);

  const refreshUser = useCallback(async () => {
    const currentUser = getFirebaseAuth()?.currentUser;
    if (!currentUser) {
      return;
    }

    await reload(currentUser);
    setUser(currentUser);
    setRevision((value) => value + 1);
  }, []);

  const refreshSetup = useCallback(() => {
    const currentUser = auth?.currentUser;
    if (!currentUser?.emailVerified) {
      return;
    }

    setSetupError(false);
    setSetupLoading(true);
    subscribeToSetup(currentUser.uid, true);
  }, [auth, subscribeToSetup]);

  const confirmFamilyCreated = useCallback((familyId: string) => {
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      return;
    }

    const confirmedSetup: ParentSetup = {
      familyId,
      activeProfileId: null,
      onboardingComplete: false,
    };
    setupConfirmation.current = confirmedSetup;
    setSetup(confirmedSetup);
    setSetupError(false);
    setSetupLoading(false);

    subscribeToSetup(currentUser.uid, false);
  }, [auth, subscribeToSetup]);

  const confirmManagedProfileCreated = useCallback((familyId: string, profileId: string) => {
    const confirmedSetup: ParentSetup = {
      familyId,
      activeProfileId: profileId,
      onboardingComplete: true,
    };
    setupConfirmation.current = confirmedSetup;
    setSetup(confirmedSetup);
    setSetupError(false);
    setSetupLoading(false);
    const currentUser = auth?.currentUser;
    if (currentUser) {
      void writeCachedParentSetup(currentUser.uid, confirmedSetup);
    }
  }, [auth]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      setup,
      setupLoading,
      setupError,
      refreshUser,
      refreshSetup,
      confirmFamilyCreated,
      confirmManagedProfileCreated,
    }),
    [
      user,
      initializing,
      setup,
      setupLoading,
      setupError,
      refreshUser,
      refreshSetup,
      confirmFamilyCreated,
      confirmManagedProfileCreated,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuthSession must be used within AuthProvider.');
  }

  return value;
}
