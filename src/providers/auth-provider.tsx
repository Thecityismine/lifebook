import type { User } from 'firebase/auth';
import { onIdTokenChanged, reload } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/services/firebase';
import { subscribeToParentSetup, type ParentSetup } from '@/services/family';

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  setup: ParentSetup | null;
  setupLoading: boolean;
  setupError: boolean;
  refreshUser: () => Promise<void>;
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
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      setupUnsubscribe.current?.();
      setupUnsubscribe.current = null;
      setUser(nextUser);
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

  const value = useMemo(
    () => ({ user, initializing, setup, setupLoading, setupError, refreshUser }),
    [user, initializing, setup, setupLoading, setupError, refreshUser],
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
