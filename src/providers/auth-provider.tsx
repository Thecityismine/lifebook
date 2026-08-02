import type { User } from 'firebase/auth';
import { onIdTokenChanged, reload } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';
import { subscribeToParentSetup, type ParentSetup } from '@/services/family';
import {
  authSetupIdentity,
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
  const [, setRevision] = useState(0);

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
      setSetup(null);
      setSetupError(false);

      if (nextUser?.emailVerified) {
        setSetupLoading(true);
        setupUnsubscribe.current = subscribeToParentSetup(
          nextUser.uid,
          (nextSetup) => {
            setSetup(nextSetup);
            setSetupLoading(false);
          },
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
  }, [auth]);

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

    setSetup((currentSetup) => ({
      familyId,
      activeProfileId: currentSetup?.activeProfileId ?? null,
      onboardingComplete: currentSetup?.onboardingComplete ?? false,
    }));
    setSetupError(false);
    setSetupLoading(false);

    setupUnsubscribe.current?.();
    setupUnsubscribe.current = subscribeToParentSetup(
      currentUser.uid,
      (nextSetup) => {
        setSetup(nextSetup);
        setSetupError(false);
        setSetupLoading(false);
      },
      () => {
        setSetupError(true);
        setSetupLoading(false);
      },
    );
  }, [auth]);

  const value = useMemo(
    () => ({ user, initializing, setup, setupLoading, setupError, refreshUser, confirmFamilyCreated }),
    [user, initializing, setup, setupLoading, setupError, refreshUser, confirmFamilyCreated],
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
