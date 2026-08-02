import type { User } from 'firebase/auth';
import { onIdTokenChanged, reload } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';
import { subscribeToParentSetup, type ParentSetup } from '@/services/family';
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

    if (useCachedSetup) {
      void readCachedParentSetup(userId).then((cachedSetup) => {
        if (revision !== setupSubscriptionRevision.current || observedLiveSetup || !cachedSetup) {
          return;
        }
        setSetup((currentSetup) => currentSetup ?? cachedSetup);
        setSetupLoading(false);
      });
    }

    setupUnsubscribe.current = subscribeToParentSetup(
      userId,
      (nextSetup) => {
        if (revision !== setupSubscriptionRevision.current) {
          return;
        }
        observedLiveSetup = true;
        const reconciliation = reconcileConfirmedSetup(nextSetup, setupConfirmation.current);
        setupConfirmation.current = reconciliation.pendingConfirmation;
        setSetup(reconciliation.setup);
        setSetupError(false);
        setSetupLoading(false);
        void writeCachedParentSetup(userId, reconciliation.setup);
      },
      (code) => {
        if (revision !== setupSubscriptionRevision.current) {
          return;
        }
        console.warn('[auth-setup] Unable to load parent setup.', { code });
        setSetupError(true);
        setSetupLoading(false);
      },
    );
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
