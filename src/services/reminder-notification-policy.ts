export const DEFAULT_REMINDER_NOTIFICATION_TIME = '09:00';
export const MAX_SCHEDULED_REMINDERS = 60;

export type ReminderNotificationCandidate = {
  id: string;
  dueOn: string;
  timeOfDay: string;
  completedAt: unknown | null;
  archivedAt: unknown | null;
};

export type ReminderNotificationPlan = {
  reminderId: string;
  triggerAt: Date;
  signature: string;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function reminderNotificationDate(
  dueOn: string,
  timeOfDay: string,
): Date | null {
  const dateMatch = DATE_PATTERN.exec(dueOn);
  const timeMatch = TIME_PATTERN.exec(timeOfDay || DEFAULT_REMINDER_NOTIFICATION_TIME);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const triggerAt = new Date(year, month, day, hour, minute, 0, 0);

  if (
    triggerAt.getFullYear() !== year
    || triggerAt.getMonth() !== month
    || triggerAt.getDate() !== day
    || triggerAt.getHours() !== hour
    || triggerAt.getMinutes() !== minute
  ) {
    return null;
  }

  return triggerAt;
}

export function buildReminderNotificationPlans(
  reminders: ReminderNotificationCandidate[],
  now = new Date(),
  limit = MAX_SCHEDULED_REMINDERS,
): ReminderNotificationPlan[] {
  return reminders
    .flatMap((reminder) => {
      if (reminder.completedAt || reminder.archivedAt) {
        return [];
      }

      const triggerAt = reminderNotificationDate(reminder.dueOn, reminder.timeOfDay);
      if (!triggerAt || triggerAt.getTime() <= now.getTime()) {
        return [];
      }

      return [{
        reminderId: reminder.id,
        triggerAt,
        signature: `${reminder.id}:${triggerAt.getTime()}`,
      }];
    })
    .sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime())
    .slice(0, Math.max(0, limit));
}

export function reminderNotificationUrl(reminderId: string) {
  return `/reminder?id=${encodeURIComponent(reminderId)}`;
}
