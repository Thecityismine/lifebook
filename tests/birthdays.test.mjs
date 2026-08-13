import assert from 'node:assert/strict';
import test from 'node:test';

import {
  birthdayCountdownLabel,
  birthdayOccurrence,
  birthdaysByDay,
  birthdaysInMonth,
  calendarCells,
  nextBirthdayOccurrence,
  parseBirthday,
  remainingBirthdaysThisMonth,
  shiftMonth,
  upcomingBirthdays,
} from '../src/services/birthdays.ts';

function person(overrides = {}) {
  return {
    id: 'person-1',
    firstName: 'Liam',
    lastName: 'Perera',
    birthday: '2016-08-20',
    photoUrl: null,
    ...overrides,
  };
}

const august12 = new Date(2026, 7, 12);

test('parses a stored birthday and rejects impossible dates', () => {
  assert.deepEqual(parseBirthday('2016-08-20'), { year: 2016, month: 8, day: 20 });
  assert.equal(parseBirthday('2016-02-30'), null);
  assert.equal(parseBirthday('2016-13-01'), null);
  assert.equal(parseBirthday('08-20'), null);
  assert.equal(parseBirthday(''), null);
});

test('observes a February 29th birthday on the 28th in a common year', () => {
  const leapling = { year: 2016, month: 2, day: 29 };
  assert.equal(birthdayOccurrence(leapling, 2024).getDate(), 29);
  assert.equal(birthdayOccurrence(leapling, 2026).getMonth(), 1);
  assert.equal(birthdayOccurrence(leapling, 2026).getDate(), 28);
});

test('rolls to next year once this year’s birthday has passed', () => {
  const parsed = { year: 2016, month: 3, day: 4 };
  assert.equal(nextBirthdayOccurrence(parsed, august12).getFullYear(), 2027);
});

test('treats a birthday landing today as still upcoming', () => {
  const parsed = { year: 2016, month: 8, day: 12 };
  const next = nextBirthdayOccurrence(parsed, august12);
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getDate(), 12);
});

test('collects a month’s birthdays in day order with the age being reached', () => {
  const entries = birthdaysInMonth([
    person({ id: 'late', firstName: 'Marly', lastName: 'Deschamps', birthday: '1994-08-27' }),
    person({ id: 'early', firstName: 'Bryan', lastName: 'Alvarez Valle', birthday: '2015-08-03' }),
    person({ id: 'other-month', firstName: 'Ana', birthday: '2015-09-03' }),
    person({ id: 'no-birthday', firstName: 'Sam', birthday: '' }),
  ], 2026, 8, august12);

  assert.deepEqual(entries.map((entry) => entry.person.id), ['early', 'late']);
  assert.deepEqual(entries.map((entry) => entry.turningAge), [11, 32]);
  assert.deepEqual(entries.map((entry) => entry.daysUntil), [-9, 15]);
});

test('drops the days already gone by when listing what is left this month', () => {
  const entries = remainingBirthdaysThisMonth([
    person({ id: 'passed', birthday: '2015-08-03' }),
    person({ id: 'today', birthday: '2015-08-12' }),
    person({ id: 'ahead', birthday: '2015-08-27' }),
  ], august12);

  assert.deepEqual(entries.map((entry) => entry.person.id), ['today', 'ahead']);
  assert.equal(birthdayCountdownLabel(entries[0]), 'Today');
  assert.equal(birthdayCountdownLabel(entries[1]), 'In 15 days');
});

test('orders upcoming birthdays across the year boundary', () => {
  const entries = upcomingBirthdays([
    person({ id: 'january', birthday: '2015-01-06' }),
    person({ id: 'august', birthday: '2015-08-27' }),
    person({ id: 'september', birthday: '2015-09-02' }),
  ], august12);

  assert.deepEqual(entries.map((entry) => entry.person.id), ['august', 'september', 'january']);
});

test('honours the horizon when listing upcoming birthdays', () => {
  const entries = upcomingBirthdays([person({ birthday: '2015-10-01' })], august12, 30);
  assert.deepEqual(entries, []);
});

test('groups a month’s entries by day, breaking ties on the same day by name', () => {
  const byDay = birthdaysByDay(birthdaysInMonth([
    person({ id: 'liam', firstName: 'Liam', birthday: '2015-08-27' }),
    person({ id: 'ana', firstName: 'Ana', birthday: '2001-08-27' }),
  ], 2026, 8, august12));

  assert.deepEqual(byDay.get(27)?.map((entry) => entry.person.id), ['ana', 'liam']);
  assert.equal(byDay.get(3), undefined);
});

test('pads the month grid so the first day sits under its weekday', () => {
  // August 2026 starts on a Saturday and has 31 days.
  const cells = calendarCells(2026, 8);
  assert.equal(cells.length, 6 + 31);
  assert.deepEqual(cells.slice(0, 7), [null, null, null, null, null, null, 1]);
  assert.equal(cells[cells.length - 1], 31);
});

test('steps across year boundaries when changing month', () => {
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});
