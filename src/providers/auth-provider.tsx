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

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  setup: ParentSetup | null;
  setupLoading: boolean;
  setupError: boolean;
  refreshUser: () => Promise<void>;
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
  const [, setRevision] = useState(0);

  const applySetupObservation = useCallback((nextSetup: ParentSetup | null) => {
    const reconciliation = reconcileConfirmedSetup(nextSetup, setupConfirmation.current);
    setupConfirmation.current = reconciliation.pendingConfirmation;
    setSetup(reconciliation.setup);
    setSetupError(false);
    setSetupLoading(false);
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
      setupIdentity.current = nextSetupIdentity;
      setupConfirmation.current = null;
      setSetup(null);
      setSetupError(false);

      if (nextUser?.emailVerified) {
        setSetupLoading(true);
        setupUnsubscribe.current = subscribeToParentSetup(
          nextUser.uid,
          applySetupObservation,
          () => {
            setSetupError(true);
            setSetupLoading(false);
          },
        );
      } else {
        setSetupLoading(false);
      }

      setInitializing(false);
    });

    return () => {
      setupUnsubscribe.current?.();
      unsubscribe();
    };
  }, [applySetupObservation, auth]);

  const refreshUser = useCallback(async () => {
    const currentUser = getFirebaseAuth()?.currentUser;
    if (!currentUser) {
      return;
    }

    await reload(currentUser);
    setUser(currentUser);
    setRevision((value) => value + 1);
  }, []);

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

    setupUnsubscribe.current?.();
    setupUnsubscribe.current = subscribeToParentSetup(
      currentUser.uid,
      applySetupObservation,
      () => {
        setSetupError(true);
        setSetupLoading(false);
      },
    );
  }, [applySetupObservation, auth]);

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
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      setup,
      setupLoading,
      setupError,
      refreshUser,
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
