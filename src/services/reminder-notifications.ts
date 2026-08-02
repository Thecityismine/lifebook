import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  buildReminderNotificationPlans,
  reminderNotificationUrl,
} from '@/services/reminder-notification-policy';
import type { ReminderRecord } from '@/services/reminders';

export type ReminderNotificationPermission = 'unsupported' | 'undetermined' | 'denied' | 'granted';

export type ReminderNotificationScope = {
  userId: string;
  familyId: string;
  profileId: string;
};

export type ReminderNotificationTap = {
  reminderId: string;
  familyId: string;
  profileId: string;
};

type ScheduledReminder = {
  identifier: string;
  reminderId: string;
  signature: string;
};

type ScheduleRegistry = {
  version: 1;
  scopeKey: string;
  timeZone: string;
  items: ScheduledReminder[];
};

const CHANNEL_ID = 'lifebook-reminders';
const REGISTRY_KEY = '@lifebook/reminder-notifications/schedules/v1';
const PREFERENCE_PREFIX = '@lifebook/reminder-notifications/preference/v1:';
let operationQueue: Promise<unknown> = Promise.resolve();

function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.catch(() => undefined);
  return result;
}

function timeZoneName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  } catch {
    return 'local';
  }
}

function scopeKey(scope: ReminderNotificationScope) {
  return `${scope.userId}:${scope.familyId}:${scope.profileId}`;
}

function preferenceKey(scope: ReminderNotificationScope) {
  return `${PREFERENCE_PREFIX}${scopeKey(scope)}`;
}

async function notificationsModule() {
  return import('expo-notifications');
}

async function readRegistry(): Promise<ScheduleRegistry | null> {
  try {
    const stored = await AsyncStorage.getItem(REGISTRY_KEY);
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<ScheduleRegistry>;
    if (value.version !== 1 || typeof value.scopeKey !== 'string' || !Array.isArray(value.items)) {
      return null;
    }
    return {
      version: 1,
      scopeKey: value.scopeKey,
      timeZone: typeof value.timeZone === 'string' ? value.timeZone : 'local',
      items: value.items.filter((item): item is ScheduledReminder => (
        typeof item?.identifier === 'string'
        && typeof item.reminderId === 'string'
        && typeof item.signature === 'string'
      )),
    };
  } catch {
    return null;
  }
}

async function cancelRegistry(registry: ScheduleRegistry | null) {
  if (!registry?.items.length) {
    await AsyncStorage.removeItem(REGISTRY_KEY);
    return;
  }

  const Notifications = await notificationsModule();
  const results = await Promise.allSettled(
    registry.items.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  const failed = registry.items.filter((_, index) => results[index].status === 'rejected');
  if (failed.length) {
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify({ ...registry, items: failed }));
    throw new Error('LifeBook could not remove every previous device reminder. Please try again.');
  }
  await AsyncStorage.removeItem(REGISTRY_KEY);
}

export function reminderNotificationsSupported() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export async function configureReminderNotifications() {
  if (!reminderNotificationsSupported()) return;
  const Notifications = await notificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Private reminders',
      description: 'Private LifeBook reminder alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
  }
}

export async function getReminderNotificationPermission(): Promise<ReminderNotificationPermission> {
  if (!reminderNotificationsSupported()) return 'unsupported';
  try {
    const Notifications = await notificationsModule();
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status === 'granted') return 'granted';
    return permission.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestReminderNotificationPermission(): Promise<ReminderNotificationPermission> {
  if (!reminderNotificationsSupported()) return 'unsupported';
  try {
    await configureReminderNotifications();
    const Notifications = await notificationsModule();
    const permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    if (permission.status === 'granted') return 'granted';
    return permission.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function getReminderNotificationPreference(scope: ReminderNotificationScope) {
  if (!reminderNotificationsSupported()) return false;
  return (await AsyncStorage.getItem(preferenceKey(scope))) === 'enabled';
}

export async function setReminderNotificationPreference(
  scope: ReminderNotificationScope,
  enabled: boolean,
) {
  if (!reminderNotificationsSupported()) return;
  if (enabled) {
    await AsyncStorage.setItem(preferenceKey(scope), 'enabled');
  } else {
    await AsyncStorage.removeItem(preferenceKey(scope));
  }
}

export function clearManagedReminderNotifications() {
  if (!reminderNotificationsSupported()) return Promise.resolve();
  return queueOperation(async () => cancelRegistry(await readRegistry()));
}

export function reconcileReminderNotifications(
  scope: ReminderNotificationScope,
  reminders: ReminderRecord[],
) {
  if (!reminderNotificationsSupported()) return Promise.resolve(0);
  return queueOperation(async () => {
    const Notifications = await notificationsModule();
    const plans = buildReminderNotificationPlans(reminders);
    const registry = await readRegistry();
    const nextScopeKey = scopeKey(scope);
    const nextTimeZone = timeZoneName();
    const signaturesMatch = registry?.scopeKey === nextScopeKey
      && registry.timeZone === nextTimeZone
      && registry.items.length === plans.length
      && registry.items.every((item, index) => item.signature === plans[index].signature);

    if (signaturesMatch && registry) {
      const nativeIdentifiers = new Set(
        (await Notifications.getAllScheduledNotificationsAsync()).map((item) => item.identifier),
      );
      if (registry.items.every((item) => nativeIdentifiers.has(item.identifier))) {
        return registry.items.length;
      }
    }

    await cancelRegistry(registry);
    const items: ScheduledReminder[] = [];
    const nextRegistry: ScheduleRegistry = {
      version: 1,
      scopeKey: nextScopeKey,
      timeZone: nextTimeZone,
      items,
    };
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(nextRegistry));
    for (const plan of plans) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'LifeBook reminder',
          body: 'You have a private family reminder.',
          sound: 'default',
          data: {
            type: 'lifebook-reminder',
            url: reminderNotificationUrl(plan.reminderId),
            reminderId: plan.reminderId,
            familyId: scope.familyId,
            profileId: scope.profileId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.triggerAt,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
      });
      items.push({ identifier, reminderId: plan.reminderId, signature: plan.signature });
      await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(nextRegistry));
    }

    return items.length;
  });
}

function tapFromData(data: Record<string, unknown>): ReminderNotificationTap | null {
  if (
    data.type !== 'lifebook-reminder'
    || typeof data.reminderId !== 'string'
    || typeof data.familyId !== 'string'
    || typeof data.profileId !== 'string'
  ) {
    return null;
  }
  return {
    reminderId: data.reminderId,
    familyId: data.familyId,
    profileId: data.profileId,
  };
}

export async function observeReminderNotificationTaps(
  onTap: (tap: ReminderNotificationTap) => void,
) {
  if (!reminderNotificationsSupported()) return () => undefined;
  const Notifications = await notificationsModule();
  const handleNotification = (data: Record<string, unknown>) => {
    const tap = tapFromData(data);
    if (tap) onTap(tap);
  };
  const response = Notifications.getLastNotificationResponse();
  if (response) {
    handleNotification(response.notification.request.content.data ?? {});
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((nextResponse) => {
    handleNotification(nextResponse.notification.request.content.data ?? {});
    Notifications.clearLastNotificationResponse();
  });
  return () => subscription.remove();
}
