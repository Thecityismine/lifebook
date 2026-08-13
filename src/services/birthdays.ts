/**
 * Birthdays are derived from the `birthday` field on a person rather than stored
 * as their own records, so nothing has to be kept in sync when a person is edited.
 * Everything here is pure and works on a structural person shape so it can be
 * tested without Firebase.
 */

export type BirthdayPerson = {
  id: string;
  firstName: string;
  lastName: string;
  birthday: string;
  photoUrl?: string | null;
};

export type ParsedBirthday = {
  year: number;
  month: number;
  day: number;
};

export type BirthdayEntry<TPerson extends BirthdayPerson = BirthdayPerson> = {
  person: TPerson;
  /** Month of the birthday itself, 1-12. */
  month: number;
  /** Day of the birthday itself, 1-31. */
  day: number;
  /** Local midnight of the occurrence this entry describes. */
  observedOn: Date;
  /** Whole days from today to `observedOn`; negative once it has passed. */
  daysUntil: number;
  /** Age reached on this occurrence, or null when the stored year is unusable. */
  turningAge: number | null;
};

const BIRTHDAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_PLAUSIBLE_AGE = 150;

export function parseBirthday(value: string): ParsedBirthday | null {
  const match = BIRTHDAY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  return probe.getUTCFullYear() === year
    && probe.getUTCMonth() === month - 1
    && probe.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function displayName(person: BirthdayPerson) {
  return `${person.firstName} ${person.lastName}`.trim();
}

/**
 * The birthday as it lands in a given year. A February 29th birthday is observed
 * on the 28th in common years so it never silently disappears from a month.
 */
export function birthdayOccurrence(parsed: ParsedBirthday, year: number) {
  const day = parsed.month === 2 && parsed.day === 29 && !isLeapYear(year) ? 28 : parsed.day;
  return new Date(year, parsed.month - 1, day);
}

export function nextBirthdayOccurrence(parsed: ParsedBirthday, now = new Date()) {
  const today = startOfDay(now);
  const thisYear = birthdayOccurrence(parsed, today.getFullYear());
  return thisYear.getTime() >= today.getTime()
    ? thisYear
    : birthdayOccurrence(parsed, today.getFullYear() + 1);
}

function daysUntil(observedOn: Date, now: Date) {
  return Math.round((observedOn.getTime() - startOfDay(now).getTime()) / MILLISECONDS_PER_DAY);
}

function turningAgeOn(parsed: ParsedBirthday, observedOn: Date) {
  const age = observedOn.getFullYear() - parsed.year;
  return age > 0 && age <= MAX_PLAUSIBLE_AGE ? age : null;
}

function toEntry<TPerson extends BirthdayPerson>(
  person: TPerson,
  parsed: ParsedBirthday,
  observedOn: Date,
  now: Date,
): BirthdayEntry<TPerson> {
  return {
    person,
    month: parsed.month,
    day: parsed.day,
    observedOn,
    daysUntil: daysUntil(observedOn, now),
    turningAge: turningAgeOn(parsed, observedOn),
  };
}

function byDayThenName(left: BirthdayEntry, right: BirthdayEntry) {
  return left.observedOn.getTime() - right.observedOn.getTime()
    || displayName(left.person).localeCompare(displayName(right.person));
}

/**
 * Every birthday that falls in the given month, whether or not it has passed.
 * `month` is 1-12.
 */
export function birthdaysInMonth<TPerson extends BirthdayPerson>(
  people: TPerson[],
  year: number,
  month: number,
  now = new Date(),
): BirthdayEntry<TPerson>[] {
  return people
    .flatMap((person) => {
      const parsed = parseBirthday(person.birthday);
      if (!parsed) {
        return [];
      }
      const observedOn = birthdayOccurrence(parsed, year);
      return observedOn.getMonth() === month - 1 ? [toEntry(person, parsed, observedOn, now)] : [];
    })
    .sort(byDayThenName);
}

/** This month's birthdays that have not happened yet, today included. */
export function remainingBirthdaysThisMonth<TPerson extends BirthdayPerson>(
  people: TPerson[],
  now = new Date(),
): BirthdayEntry<TPerson>[] {
  return birthdaysInMonth(people, now.getFullYear(), now.getMonth() + 1, now)
    .filter((entry) => entry.daysUntil >= 0);
}

/** The next occurrence for each person, nearest first. */
export function upcomingBirthdays<TPerson extends BirthdayPerson>(
  people: TPerson[],
  now = new Date(),
  withinDays = 365,
): BirthdayEntry<TPerson>[] {
  return people
    .flatMap((person) => {
      const parsed = parseBirthday(person.birthday);
      if (!parsed) {
        return [];
      }
      const entry = toEntry(person, parsed, nextBirthdayOccurrence(parsed, now), now);
      return entry.daysUntil <= withinDays ? [entry] : [];
    })
    .sort(byDayThenName);
}

export function birthdaysByDay<TPerson extends BirthdayPerson>(entries: BirthdayEntry<TPerson>[]) {
  const byDay = new Map<number, BirthdayEntry<TPerson>[]>();
  for (const entry of entries) {
    const dayOfMonth = entry.observedOn.getDate();
    byDay.set(dayOfMonth, [...(byDay.get(dayOfMonth) || []), entry]);
  }
  return byDay;
}

/**
 * Day cells for a month grid, padded with nulls so the first day lands under its
 * weekday column. `weekStartsOn` is 0 for Sunday.
 */
export function calendarCells(year: number, month: number, weekStartsOn = 0) {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;

  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function shiftMonth(year: number, month: number, offset: number) {
  const shifted = new Date(year, month - 1 + offset, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

export function birthdayCountdownLabel(entry: BirthdayEntry) {
  if (entry.daysUntil === 0) return 'Today';
  if (entry.daysUntil === 1) return 'Tomorrow';
  if (entry.daysUntil > 1) return `In ${entry.daysUntil} days`;
  if (entry.daysUntil === -1) return 'Yesterday';
  return `${Math.abs(entry.daysUntil)} days ago`;
}

export function birthdayDateLabel(entry: BirthdayEntry) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(entry.observedOn);
}

/** "Tomorrow · Aug 13 · turning 9" */
export function birthdayDetailLabel(entry: BirthdayEntry) {
  return [
    birthdayCountdownLabel(entry),
    birthdayDateLabel(entry),
    entry.turningAge === null ? '' : `turning ${entry.turningAge}`,
  ].filter(Boolean).join(' · ');
}

export function birthdayTitle(entry: BirthdayEntry) {
  return `${displayName(entry.person) || 'Someone'}’s birthday`;
}
