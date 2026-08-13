import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  birthdayCountdownLabel,
  birthdaysByDay,
  birthdaysInMonth,
  calendarCells,
  monthLabel,
  shiftMonth,
} from '@/services/birthdays';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';

const MAX_DOTS = 3;

// A known Sunday, so the weekday strip follows the device locale without a hardcoded list.
const WEEKDAY_ANCHOR = new Date(2024, 0, 7);
const weekdayNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'short' })
  .format(new Date(WEEKDAY_ANCHOR.getFullYear(), WEEKDAY_ANCHOR.getMonth(), WEEKDAY_ANCHOR.getDate() + index)));

export default function BirthdayCalendarScreen() {
  const router = useRouter();
  const { setup } = useAuthSession();
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() + 1 }));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!setup?.familyId) {
      return;
    }

    return subscribeToPeople(
      setup.familyId,
      (nextPeople) => {
        setPeople(nextPeople);
        setLoading(false);
        setError('');
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [setup?.familyId]);

  const activePeople = useMemo(() => people.filter((person) => !person.archivedAt), [people]);
  const monthEntries = useMemo(
    () => birthdaysInMonth(activePeople, view.year, view.month, today),
    [activePeople, today, view.month, view.year],
  );
  const entriesByDay = useMemo(() => birthdaysByDay(monthEntries), [monthEntries]);
  const cells = useMemo(() => calendarCells(view.year, view.month), [view.month, view.year]);
  const listedEntries = selectedDay === null
    ? monthEntries
    : entriesByDay.get(selectedDay) || [];
  const showingCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth() + 1;

  const goToMonth = (offset: number) => {
    setSelectedDay(null);
    setView((current) => shiftMonth(current.year, current.month, offset));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Never miss a day</Text>
            <Text style={styles.title}>Birthdays</Text>
            <Text style={styles.subtitle}>
              {monthEntries.length === 0
                ? `No birthdays in ${monthLabel(view.year, view.month)}`
                : `${monthEntries.length} ${monthEntries.length === 1 ? 'birthday' : 'birthdays'} in ${monthLabel(view.year, view.month)}`}
            </Text>
          </View>
          {showingCurrentMonth ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to this month"
              onPress={() => {
                setSelectedDay(null);
                setView({ year: today.getFullYear(), month: today.getMonth() + 1 });
              }}
              style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => goToMonth(-1)}
              style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={20} color={AppColors.ink} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel(view.year, view.month)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => goToMonth(1)}
              style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}>
              <Ionicons name="chevron-forward" size={20} color={AppColors.ink} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {weekdayNames.map((name, index) => (
              <View key={`${name}-${index}`} style={styles.cell}>
                <Text style={styles.weekdayText}>{name}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`pad-${index}`} style={styles.cell} />;
              }

              const dayEntries = entriesByDay.get(day) || [];
              const isToday = showingCurrentMonth && day === today.getDate();
              const isSelected = day === selectedDay;
              const dayName = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })
                .format(new Date(view.year, view.month - 1, day));

              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={dayEntries.length === 0
                    ? `${dayName}, no birthdays`
                    : `${dayName}, ${dayEntries.map((entry) => personDisplayName(entry.person)).join(', ')}`}
                  disabled={dayEntries.length === 0}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                  style={styles.cell}>
                  <View style={[
                    styles.dayInner,
                    dayEntries.length > 0 && styles.dayWithBirthday,
                    isToday && styles.dayToday,
                    isSelected && styles.daySelected,
                  ]}>
                    <Text style={[
                      styles.dayText,
                      dayEntries.length === 0 && styles.dayTextQuiet,
                      isSelected && styles.dayTextSelected,
                    ]}>
                      {day}
                    </Text>
                    <View style={styles.dotRow}>
                      {dayEntries.slice(0, MAX_DOTS).map((entry) => (
                        <View
                          key={entry.person.id}
                          style={[styles.dot, isSelected && styles.dotSelected]}
                        />
                      ))}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={AppColors.violet} />
            <Text style={styles.stateTitle}>Opening your private directory…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={AppColors.danger} />
            <Text style={styles.stateTitle}>Birthdays are unavailable</Text>
            <Text style={styles.stateDetail}>{error}</Text>
          </View>
        ) : listedEntries.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="gift-outline" size={32} color={AppColors.sun} />
            </View>
            <Text style={styles.stateTitle}>
              {selectedDay === null ? 'No birthdays this month' : 'No birthdays on this day'}
            </Text>
            <Text style={styles.stateDetail}>
              Add a birthday to someone in your family directory and it will show up here every year.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/people')}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <Ionicons name="people" size={19} color={AppColors.onAccent} />
              <Text style={styles.addButtonText}>Open People</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {selectedDay === null ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show the whole month"
                onPress={() => setSelectedDay(null)}
                style={({ pressed }) => [styles.clearDay, pressed && styles.pressed]}>
                <Text style={styles.clearDayText}>
                  {new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })
                    .format(new Date(view.year, view.month - 1, selectedDay))}
                </Text>
                <Ionicons name="close-circle" size={18} color={AppColors.slate} />
              </Pressable>
            )}
            {listedEntries.map((entry) => (
              <Pressable
                key={entry.person.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${personDisplayName(entry.person)}`}
                onPress={() => router.push({ pathname: '/person', params: { id: entry.person.id } })}
                style={({ pressed }) => [styles.birthdayCard, pressed && styles.pressed]}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateBlockMonth}>
                    {new Intl.DateTimeFormat(undefined, { month: 'short' }).format(entry.observedOn).toUpperCase()}
                  </Text>
                  <Text style={styles.dateBlockDay}>{entry.observedOn.getDate()}</Text>
                </View>
                <View style={styles.birthdayCopy}>
                  <Text numberOfLines={1} style={styles.birthdayName}>{personDisplayName(entry.person)}</Text>
                  <Text style={styles.birthdayDetail}>
                    {entry.turningAge === null ? 'Birthday' : `Turning ${entry.turningAge}`}
                  </Text>
                  <Text style={[styles.birthdayCountdown, entry.daysUntil < 0 && styles.birthdayCountdownPast]}>
                    {birthdayCountdownLabel(entry)}
                  </Text>
                </View>
                <Avatar
                  initials={personInitials(entry.person)}
                  imageUri={entry.person.photoUrl}
                  color={AppColors.sky}
                  size={44}
                />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.privateNote}>
          <Ionicons name="shield-checkmark" size={18} color={AppColors.mint} />
          <Text style={styles.privateText}>Birthdays come from your private family directory.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.section,
    gap: Spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '700' },
  subtitle: { color: AppColors.inkMuted, fontSize: 13, marginTop: 2 },
  iconButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  todayButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: AppColors.violetSoft,
    borderWidth: 1,
    borderColor: AppColors.violet,
  },
  todayButtonText: { color: AppColors.violet, fontSize: 12, fontWeight: '800' },

  calendarCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: Spacing.md,
    ...Shadow.card,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: AppColors.cloud,
  },
  monthLabel: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 17, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap' },
  weekdayText: { color: AppColors.slate, fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dayInner: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayWithBirthday: { backgroundColor: AppColors.sunSoft },
  dayToday: { borderColor: AppColors.violet },
  daySelected: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  dayText: { color: AppColors.ink, fontSize: 14, fontWeight: '700' },
  dayTextQuiet: { color: AppColors.slate, fontWeight: '500' },
  dayTextSelected: { color: AppColors.onAccent },
  dotRow: { flexDirection: 'row', gap: 2, height: 5, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.sun },
  dotSelected: { backgroundColor: AppColors.onAccent },

  list: { gap: Spacing.md },
  clearDay: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  clearDayText: { color: AppColors.ink, fontSize: 12, fontWeight: '700' },
  birthdayCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  dateBlock: {
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: AppColors.sunSoft,
  },
  dateBlockMonth: { color: AppColors.sun, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  dateBlockDay: { color: AppColors.ink, fontSize: 20, fontWeight: '800' },
  birthdayCopy: { flex: 1 },
  birthdayName: { color: AppColors.ink, fontSize: 16, fontWeight: '700' },
  birthdayDetail: { color: AppColors.inkMuted, fontSize: 12, marginTop: 4 },
  birthdayCountdown: { color: AppColors.violet, fontSize: 11, fontWeight: '700', marginTop: 4 },
  birthdayCountdownPast: { color: AppColors.slate },

  stateCard: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: AppColors.sunSoft,
  },
  stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateDetail: { maxWidth: 390, color: AppColors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.violet,
  },
  addButtonText: { color: AppColors.onAccent, fontWeight: '700' },

  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  privateText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
});
