import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { reminderKind } from '@/constants/reminders';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';
import { reminderRelativeLabel, subscribeToReminders, type ReminderRecord } from '@/services/reminders';

const filters = ['Upcoming', 'Completed', 'Archived'] as const;
type ReminderFilter = typeof filters[number];

export default function RemindersScreen() {
  const router = useRouter();
  const { setup } = useAuthSession();
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReminderFilter>('Upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setup?.familyId || !setup.activeProfileId) return;
    const unsubscribeReminders = subscribeToReminders(setup.familyId, setup.activeProfileId, (value) => {
      setReminders(value); setLoading(false); setError('');
    }, (message) => { setError(message); setLoading(false); });
    const unsubscribePeople = subscribeToPeople(setup.familyId, setPeople, setError);
    return () => { unsubscribeReminders(); unsubscribePeople(); };
  }, [setup?.activeProfileId, setup?.familyId]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const visibleReminders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return reminders.filter((reminder) => {
      const matchesState = filter === 'Archived'
        ? Boolean(reminder.archivedAt)
        : filter === 'Completed'
          ? Boolean(reminder.completedAt) && !reminder.archivedAt
          : !reminder.completedAt && !reminder.archivedAt;
      if (!matchesState) return false;
      const person = peopleById.get(reminder.personId);
      return !query || [reminder.title, reminder.notes, reminder.dueOn, person ? personDisplayName(person) : ''].join(' ').toLocaleLowerCase().includes(query);
    });
  }, [filter, peopleById, reminders, search]);
  const upcomingCount = reminders.filter((item) => !item.completedAt && !item.archivedAt).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={AppColors.ink} /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>Keep track together</Text><Text style={styles.title}>Reminders</Text><Text style={styles.subtitle}>{upcomingCount} {upcomingCount === 1 ? 'moment' : 'moments'} coming up</Text></View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Open reminder notification settings" onPress={() => router.push('/notification-settings')} style={styles.notificationIcon}><Ionicons name="notifications-outline" size={22} color={AppColors.violet} /></Pressable>
            <Pressable accessibilityLabel="Add a reminder" onPress={() => router.push('/edit-reminder')} style={styles.addIcon}><Ionicons name="add" size={26} color={AppColors.paper} /></Pressable>
          </View>
        </View>

        <View style={styles.searchBox}><Ionicons name="search" size={20} color={AppColors.slate} /><TextInput accessibilityLabel="Search reminders" autoCapitalize="none" onChangeText={setSearch} placeholder="Search reminders or people" placeholderTextColor={AppColors.slate} style={styles.searchInput} value={search} />{search ? <Pressable accessibilityLabel="Clear reminder search" onPress={() => setSearch('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={AppColors.slate} /></Pressable> : null}</View>
        <View style={styles.filters}>{filters.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === filter }} onPress={() => setFilter(item)} style={[styles.filter, item === filter && styles.filterActive]}><Text style={[styles.filterText, item === filter && styles.filterTextActive]}>{item}</Text></Pressable>)}</View>

        {loading ? <View style={styles.stateCard}><ActivityIndicator color={AppColors.violet} /><Text style={styles.stateTitle}>Opening your private reminders…</Text></View>
          : error ? <View style={styles.stateCard}><Ionicons name="cloud-offline-outline" size={30} color={AppColors.danger} /><Text style={styles.stateTitle}>Reminders are unavailable</Text><Text style={styles.stateDetail}>{error}</Text></View>
            : visibleReminders.length === 0 ? <View style={styles.stateCard}><View style={styles.emptyIcon}><Ionicons name="notifications-outline" size={32} color={AppColors.sun} /></View><Text style={styles.stateTitle}>{reminders.length === 0 ? 'Add the first reminder' : `No ${filter.toLocaleLowerCase()} reminders`}</Text><Text style={styles.stateDetail}>{reminders.length === 0 ? 'Keep birthdays, appointments, school moments, and activities visible to your family.' : 'Try another search or switch reminder filters.'}</Text>{reminders.length === 0 ? <Pressable onPress={() => router.push('/edit-reminder')} style={styles.addButton}><Ionicons name="add" size={19} color={AppColors.paper} /><Text style={styles.addButtonText}>Add reminder</Text></Pressable> : null}</View>
              : <View style={styles.list}>{visibleReminders.map((reminder) => {
                const visual = reminderKind(reminder.kind);
                const person = peopleById.get(reminder.personId);
                return <Pressable key={reminder.id} accessibilityRole="button" accessibilityLabel={`Open ${reminder.title}`} onPress={() => router.push({ pathname: '/reminder', params: { id: reminder.id } })} style={({ pressed }) => [styles.reminderCard, pressed && styles.pressed]}>
                  <View style={[styles.reminderIcon, { backgroundColor: visual.softColor }]}><Ionicons name={reminder.completedAt ? 'checkmark-circle' : visual.icon} size={27} color={reminder.completedAt ? AppColors.mint : visual.color} /></View>
                  <View style={styles.reminderCopy}><View style={styles.titleRow}><Text numberOfLines={1} style={[styles.reminderTitle, reminder.completedAt && styles.completedTitle]}>{reminder.title}</Text>{reminder.archivedAt ? <Text style={styles.archived}>Archived</Text> : null}</View><Text style={styles.reminderDate}>{reminderRelativeLabel(reminder.dueOn, reminder.timeOfDay)}</Text>{person ? <Text style={styles.personLabel}>{personDisplayName(person)}</Text> : null}</View>
                  {person ? <Avatar initials={personInitials(person)} imageUri={person.photoUrl} size={38} color={AppColors.sky} /> : <Ionicons name="chevron-forward" size={20} color={AppColors.slate} />}
                </Pressable>;
              })}</View>}
        <View style={styles.privateNote}><Ionicons name="shield-checkmark" size={18} color={AppColors.mint} /><Text style={styles.privateText}>Only verified members of your family can see these reminders.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, headerCopy: { flex: 1 }, eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }, title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '700' }, subtitle: { color: AppColors.inkMuted, fontSize: 13, marginTop: 2 },
  iconButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, headerActions: { gap: Spacing.sm }, notificationIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, addIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.violet },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, searchInput: { flex: 1, color: AppColors.ink, fontSize: 15, fontFamily: FontFamily?.regular },
  filters: { flexDirection: 'row', gap: Spacing.sm }, filter: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, filterActive: { backgroundColor: AppColors.violet, borderColor: AppColors.violet }, filterText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: AppColors.paper },
  list: { gap: Spacing.md }, reminderCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card }, reminderIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md }, reminderCopy: { flex: 1 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, reminderTitle: { flex: 1, color: AppColors.ink, fontSize: 16, fontWeight: '700' }, completedTitle: { color: AppColors.slate, textDecorationLine: 'line-through' }, archived: { color: AppColors.danger, fontSize: 9, fontWeight: '800' }, reminderDate: { color: AppColors.inkMuted, fontSize: 12, marginTop: 5 }, personLabel: { color: AppColors.violet, fontSize: 11, fontWeight: '700', marginTop: 4 },
  stateCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, emptyIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.sunSoft }, stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' }, stateDetail: { maxWidth: 390, color: AppColors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' }, addButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet }, addButtonText: { color: AppColors.paper, fontWeight: '700' },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm }, privateText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' }, pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
});
