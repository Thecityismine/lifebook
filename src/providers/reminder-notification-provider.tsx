import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { useAuthSession } from '@/providers/auth-provider';
import {
  clearManagedReminderNotifications,
  configureReminderNotifications,
  getReminderNotificationPermission,
  getReminderNotificationPreference,
  observeReminderNotificationTaps,
  reconcileReminderNotifications,
  reminderNotificationsSupported,
  requestReminderNotificationPermission,
  setReminderNotificationPreference,
  type ReminderNotificationPermission,
  type ReminderNotificationScope,
  type ReminderNotificationTap,
} from '@/services/reminder-notifications';
import { subscribeToReminders } from '@/services/reminders';

type ReminderNotificationContextValue = {
  supported: boolean;
  enabled: boolean;
  permission: ReminderNotificationPermission;
  scheduledCount: number;
  loading: boolean;
  syncing: boolean;
  error: string;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
};

const ReminderNotificationContext = createContext<ReminderNotificationContextValue | null>(null);

export function ReminderNotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { user, initializing, setup, setupLoading } = useAuthSession();
  const supported = reminderNotificationsSupported();
  const [preferenceEnabled, setPreferenceEnabled] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(!supported);
  const [permission, setPermission] = useState<ReminderNotificationPermission>(supported ? 'undetermined' : 'unsupported');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [pendingTap, setPendingTap] = useState<ReminderNotificationTap | null>(null);
  const syncRevision = useRef(0);
  const userId = user?.uid || '';
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';

  const scope = useMemo<ReminderNotificationScope | null>(() => {
    if (!userId || !familyId || !profileId) return null;
    return {
      userId,
      familyId,
      profileId,
    };
  }, [familyId, profileId, userId]);

  useEffect(() => {
    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setPreferenceLoaded(false);
      setPreferenceEnabled(false);
      setScheduledCount(0);
      setError('');
      if (!supported || !scope) {
        setPermission(supported ? 'undetermined' : 'unsupported');
        setPreferenceLoaded(true);
        if (supported) await clearManagedReminderNotifications().catch(() => undefined);
        return;
      }
      try {
        await configureReminderNotifications();
        const [nextPreference, nextPermission] = await Promise.all([
          getReminderNotificationPreference(scope),
          getReminderNotificationPermission(),
        ]);
        if (!active) return;
        setPreferenceEnabled(nextPreference);
        setPermission(nextPermission);
        setPreferenceLoaded(true);
        if (!nextPreference || nextPermission !== 'granted') {
          await clearManagedReminderNotifications();
        }
      } catch {
        if (!active) return;
        setPreferenceLoaded(true);
        setError('LifeBook could not prepare device reminders. Try again in a moment.');
      }
    })();

    return () => {
      active = false;
    };
  }, [scope, supported]);

  useEffect(() => {
    if (!supported || !scope || !preferenceLoaded || !preferenceEnabled || permission !== 'granted') {
      return;
    }

    let active = true;
    const currentRevision = ++syncRevision.current;
    const unsubscribe = subscribeToReminders(
      scope.familyId,
      scope.profileId,
      (reminders) => {
        setSyncing(true);
        void reconcileReminderNotifications(scope, reminders)
          .then((count) => {
            if (active && currentRevision === syncRevision.current) {
              setScheduledCount(count);
              setError('');
            }
          })
          .catch(() => {
            if (active && currentRevision === syncRevision.current) {
              setError('LifeBook could not refresh every device reminder. Try again.');
            }
          })
          .finally(() => {
            if (active && currentRevision === syncRevision.current) setSyncing(false);
          });
      },
      (message) => {
        if (!active) return;
        setSyncing(false);
        setError(message);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [permission, preferenceEnabled, preferenceLoaded, refreshRevision, scope, supported]);

  const enable = useCallback(async () => {
    if (!scope || !supported) return false;
    setSyncing(true);
    setError('');
    try {
      const nextPermission = await requestReminderNotificationPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        await setReminderNotificationPreference(scope, false);
        setPreferenceEnabled(false);
        setError(nextPermission === 'denied'
          ? 'Device notifications are blocked in system settings.'
          : 'Notification permission was not granted.');
        return false;
      }
      await setReminderNotificationPreference(scope, true);
      setPreferenceEnabled(true);
      setRefreshRevision((value) => value + 1);
      return true;
    } catch {
      setPreferenceEnabled(false);
      setError('LifeBook could not save the device reminder setting. Try again.');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [scope, supported]);

  const disable = useCallback(async () => {
    if (!scope || !supported) return;
    setSyncing(true);
    setError('');
    try {
      await setReminderNotificationPreference(scope, false);
      setPreferenceEnabled(false);
      await clearManagedReminderNotifications();
      setScheduledCount(0);
    } catch {
      setError('LifeBook could not remove every scheduled reminder. Try again.');
    } finally {
      setSyncing(false);
    }
  }, [scope, supported]);

  const refresh = useCallback(async () => {
    if (!scope || !supported) return;
    setSyncing(true);
    const nextPermission = await getReminderNotificationPermission();
    setPermission(nextPermission);
    if (!preferenceEnabled || nextPermission !== 'granted') {
      try {
        await clearManagedReminderNotifications();
        setScheduledCount(0);
      } catch {
        setError('LifeBook could not refresh device reminder settings.');
      } finally {
        setSyncing(false);
      }
      return;
    }
    setRefreshRevision((value) => value + 1);
  }, [preferenceEnabled, scope, supported]);

  useEffect(() => {
    if (!supported) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh, supported]);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    let remove: () => void = () => undefined;
    void observeReminderNotificationTaps((tap) => {
      if (active) setPendingTap(tap);
    }).then((unsubscribe) => {
      if (active) remove = unsubscribe;
      else unsubscribe();
    }).catch(() => {
      if (active) setError('LifeBook could not listen for device reminder taps.');
    });
    return () => {
      active = false;
      remove();
    };
  }, [supported]);

  useEffect(() => {
    if (!pendingTap || initializing || setupLoading) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      if (!user) {
        router.push('/sign-in');
        return;
      }
      if (!user.emailVerified || !setup?.familyId || !setup.activeProfileId) return;
      if (pendingTap.familyId !== setup.familyId || pendingTap.profileId !== setup.activeProfileId) {
        setPendingTap(null);
        setError('That device reminder belongs to a different active family profile.');
        return;
      }
      router.push({ pathname: '/reminder', params: { id: pendingTap.reminderId } });
      setPendingTap(null);
    })();
    return () => {
      active = false;
    };
  }, [initializing, pendingTap, router, setup?.activeProfileId, setup?.familyId, setupLoading, user]);

  const value = useMemo<ReminderNotificationContextValue>(() => ({
    supported,
    enabled: preferenceEnabled && permission === 'granted',
    permission,
    scheduledCount,
    loading: !preferenceLoaded,
    syncing,
    error,
    enable,
    disable,
    refresh,
  }), [disable, enable, error, permission, preferenceEnabled, preferenceLoaded, refresh, scheduledCount, supported, syncing]);

  return <ReminderNotificationContext.Provider value={value}>{children}</ReminderNotificationContext.Provider>;
}

export function useReminderNotifications() {
  const value = useContext(ReminderNotificationContext);
  if (!value) {
    throw new Error('useReminderNotifications must be used within ReminderNotificationProvider.');
  }
  return value;
}
