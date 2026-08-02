import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReminderNotificationPlans,
  DEFAULT_REMINDER_NOTIFICATION_TIME,
  reminderNotificationDate,
  reminderNotificationUrl,
} from '../src/services/reminder-notification-policy.ts';

function reminder(overrides = {}) {
  return {
    id: 'reminder-1',
    dueOn: '2030-05-12',
    timeOfDay: '14:30',
    completedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

test('uses 09:00 local time when a reminder has no explicit time', () => {
  const date = reminderNotificationDate('2030-05-12', '');
  assert.ok(date);
  assert.equal(DEFAULT_REMINDER_NOTIFICATION_TIME, '09:00');
  assert.equal(date.getFullYear(), 2030);
  assert.equal(date.getMonth(), 4);
  assert.equal(date.getDate(), 12);
  assert.equal(date.getHours(), 9);
  assert.equal(date.getMinutes(), 0);
});

test('rejects invalid local dates and times', () => {
  assert.equal(reminderNotificationDate('2030-02-30', '09:00'), null);
  assert.equal(reminderNotificationDate('2030-05-12', '24:00'), null);
});

test('schedules only active future reminders in chronological order', () => {
  const plans = buildReminderNotificationPlans([
    reminder({ id: 'later', timeOfDay: '16:00' }),
    reminder({ id: 'completed', completedAt: {}, timeOfDay: '12:00' }),
    reminder({ id: 'archived', archivedAt: {}, timeOfDay: '11:00' }),
    reminder({ id: 'past', dueOn: '2029-01-01' }),
    reminder({ id: 'first', timeOfDay: '10:00' }),
  ], new Date(2030, 4, 12, 8, 0));

  assert.deepEqual(plans.map((plan) => plan.reminderId), ['first', 'later']);
});

test('caps scheduled reminders and encodes deep-link IDs', () => {
  const reminders = Array.from({ length: 4 }, (_, index) => reminder({
    id: `reminder-${index}`,
    dueOn: `2030-05-${String(index + 13).padStart(2, '0')}`,
  }));
  assert.equal(buildReminderNotificationPlans(reminders, new Date(2030, 4, 1), 2).length, 2);
  assert.equal(reminderNotificationUrl('family reminder/1'), '/reminder?id=family%20reminder%2F1');
});
