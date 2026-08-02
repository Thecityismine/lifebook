import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { SectionHeader } from '@/components/section-header';
import { reminderKind } from '@/constants/reminders';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { signOutParent } from '@/services/auth';
import { subscribeToChapters, type ChapterRecord } from '@/services/chapters';
import { getFamilySummary, type FamilySummary } from '@/services/family';
import { memoryDateLabel, subscribeToMemories, type MemoryRecord } from '@/services/memories';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';
import { reminderRelativeLabel, subscribeToReminders, type ReminderRecord } from '@/services/reminders';

function QuickCard({
  icon,
  label,
  value,
  color,
  backgroundColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickCard, { backgroundColor }, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: AppColors.paper }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.quickValue}>{value}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, setup } = useAuthSession();
  const [summary, setSummary] = useState<FamilySummary | null>(null);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const profileName = summary?.profileName || 'Your family';
  const accountInitials = (user?.displayName || user?.email || 'Parent')
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  useEffect(() => {
    let active = true;
    if (!setup) {
      return () => {
        active = false;
      };
    }

    getFamilySummary(setup)
      .then((nextSummary) => {
        if (active) {
          setSummary(nextSummary);
        }
      })
      .catch(() => {
        if (active) {
          setSummary(null);
        }
      });

    return () => {
      active = false;
    };
  }, [setup]);

  useEffect(() => {
    if (!setup?.familyId || !setup.activeProfileId) {
      return;
    }
    const ignoreError = () => undefined;
    const unsubscribePeople = subscribeToPeople(setup.familyId, setPeople, ignoreError);
    const unsubscribeMemories = subscribeToMemories(setup.familyId, setup.activeProfileId, setMemories, ignoreError);
    const unsubscribeChapters = subscribeToChapters(setup.familyId, setup.activeProfileId, setChapters, ignoreError);
    const unsubscribeReminders = subscribeToReminders(setup.familyId, setup.activeProfileId, setReminders, ignoreError);
    return () => {
      unsubscribePeople();
      unsubscribeMemories();
      unsubscribeChapters();
      unsubscribeReminders();
    };
  }, [setup?.activeProfileId, setup?.familyId]);

  const activePeople = useMemo(() => people.filter((person) => !person.archivedAt), [people]);
  const activeMemories = useMemo(() => memories.filter((memory) => !memory.archivedAt), [memories]);
  const activeChapters = useMemo(() => chapters.filter((chapter) => !chapter.archivedAt), [chapters]);
  const upcomingReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.archivedAt && !reminder.completedAt).slice(0, 2),
    [reminders],
  );
  const latestMemory = activeMemories[0] || null;
  const latestPeople = useMemo(() => {
    if (!latestMemory) {
      return [];
    }
    const peopleById = new Map(people.map((person) => [person.id, person]));
    return latestMemory.personIds
      .map((personId) => peopleById.get(personId))
      .filter((person): person is PersonRecord => Boolean(person));
  }, [latestMemory, people]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>{summary?.familyName || 'LifeBook'}</Text>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.profileName}>{profileName}’s story</Text>
          </View>
          <View style={styles.headerActions}>
            <Avatar initials={accountInitials || 'P'} size={50} color={AppColors.violet} badge />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open privacy and data settings"
              onPress={() => router.push('/privacy')}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
              <Ionicons name="settings-outline" size={21} color={AppColors.violet} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={() => {
                void signOutParent();
              }}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={21} color={AppColors.inkMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.storyCard}>
          <View style={styles.storyGlowOne} />
          <View style={styles.storyGlowTwo} />
          <View style={styles.storyTopRow}>
            <View style={styles.storyIcon}>
              <Ionicons name="book" size={20} color={AppColors.violet} />
            </View>
            <Text style={styles.storyEyebrow}>{profileName.toUpperCase()}’S LIFEBOOK</Text>
          </View>
          <Text style={styles.storyTitle}>{activePeople.length} {activePeople.length === 1 ? 'person is' : 'people are'} part of this story.</Text>
          <Text style={styles.storyBody}>A growing collection of friends, family, and the moments they share.</Text>
          <View style={styles.storyFooter}>
            <View style={styles.avatarStack}>
              {activePeople.slice(0, 3).map((person, index) => (
                <View key={person.id} style={[styles.stackedAvatar, { marginLeft: index === 0 ? 0 : -9 }]}>
                  <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={AppColors.sky} size={34} />
                </View>
              ))}
              {activePeople.length > 3 ? (
                <View style={[styles.avatarCount, { marginLeft: -9 }]}>
                  <Text style={styles.avatarCountText}>+{activePeople.length - 3}</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open People"
              onPress={() => router.push('/people')}
              style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}>
              <Ionicons name="arrow-forward" size={20} color={AppColors.onAccent} />
            </Pressable>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickCard
            icon="people"
            label="People"
            value={String(activePeople.length)}
            color={AppColors.sky}
            backgroundColor={AppColors.skySoft}
            onPress={() => router.push('/people')}
          />
          <QuickCard
            icon="heart"
            label="Memories"
            value={String(activeMemories.length)}
            color={AppColors.blush}
            backgroundColor={AppColors.blushSoft}
            onPress={() => router.push('/memories')}
          />
          <QuickCard
            icon="book"
            label="Chapters"
            value={String(activeChapters.length)}
            color={AppColors.violet}
            backgroundColor={AppColors.violetSoft}
            onPress={() => router.push('/chapters')}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Coming up" action={upcomingReminders.length ? 'See all' : 'Add'} onPress={() => router.push(upcomingReminders.length ? '/reminders' : '/edit-reminder')} />
          <View style={styles.listCard}>
            {upcomingReminders.length === 0 ? (
              <Pressable onPress={() => router.push('/edit-reminder')} style={({ pressed }) => [styles.emptyEvent, pressed && styles.pressed]}>
                <View style={[styles.eventIcon, { backgroundColor: AppColors.sunSoft }]}><Ionicons name="notifications-outline" size={22} color={AppColors.sun} /></View>
                <View style={styles.eventCopy}><Text style={styles.eventTitle}>Nothing to remember yet</Text><Text style={styles.eventDetail}>Add a birthday, appointment, or important moment.</Text></View>
                <Ionicons name="add-circle" size={23} color={AppColors.violet} />
              </Pressable>
            ) : upcomingReminders.map((reminder, index) => {
              const visual = reminderKind(reminder.kind);
              const linkedPerson = people.find((person) => person.id === reminder.personId);
              return <View key={reminder.id}>{index > 0 ? <View style={styles.divider} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Open ${reminder.title}`} onPress={() => router.push({ pathname: '/reminder', params: { id: reminder.id } })} style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}>
                <View style={[styles.eventIcon, { backgroundColor: visual.softColor }]}><Ionicons name={visual.icon} size={22} color={visual.color} /></View>
                <View style={styles.eventCopy}><Text style={styles.eventTitle}>{reminder.title}</Text><Text style={styles.eventDetail}>{reminderRelativeLabel(reminder.dueOn, reminder.timeOfDay)}{linkedPerson ? ` · ${personDisplayName(linkedPerson)}` : ''}</Text></View>
                {linkedPerson ? <Avatar initials={personInitials(linkedPerson)} imageUri={linkedPerson.photoUrl} color={AppColors.sky} size={38} /> : <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />}
              </Pressable></View>;
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={latestMemory ? 'A memory to keep' : 'Start the timeline'} action={latestMemory ? 'Open' : 'Add'} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={latestMemory ? `Open ${latestMemory.title}` : 'Add the first memory'}
            onPress={() => latestMemory
              ? router.push({ pathname: '/memory', params: { id: latestMemory.id } })
              : router.push('/edit-memory')}
            style={({ pressed }) => [styles.memoryCard, pressed && styles.pressed]}>
            {latestMemory?.photoUrl ? (
              <Image source={{ uri: latestMemory.photoUrl }} resizeMode="cover" style={styles.memoryArtwork} />
            ) : (
              <View style={styles.memoryArtwork}>
                <View style={styles.memoryOrbLarge} />
                <View style={styles.memoryOrbSmall} />
                <Ionicons name={latestMemory ? 'sparkles' : 'heart'} size={34} color={AppColors.onDark} />
              </View>
            )}
            <View style={styles.memoryCopy}>
              <Text style={styles.memoryDate}>{latestMemory ? memoryDateLabel(latestMemory.occurredOn).toUpperCase() : 'PRIVATE BY DEFAULT'}</Text>
              <Text style={styles.memoryTitle}>{latestMemory?.title || 'Save the first memory'}</Text>
              <Text style={styles.memoryDetail} numberOfLines={2}>
                {latestMemory?.story || 'Keep a story, photo, or small moment and connect the people who were there.'}
              </Text>
              <View style={styles.memoryPeople}>
                {latestPeople.slice(0, 2).map((person, index) => (
                  <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -6 }}>
                    <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={index === 0 ? AppColors.sky : AppColors.mint} size={25} />
                  </View>
                ))}
                <Text style={styles.memoryPeopleText}>{latestPeople.length} {latestPeople.length === 1 ? 'person' : 'people'}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.privateNote}>
          <Ionicons name="lock-closed" size={16} color={AppColors.mint} />
          <Text style={styles.privateNoteText}>Private to your family by default</Text>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.xxl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  headerCopy: { flex: 1 },
  brand: {
    color: AppColors.violet,
    fontFamily: FontFamily?.bold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  greeting: { color: AppColors.inkMuted, fontFamily: FontFamily?.regular, fontSize: 14 },
  profileName: {
    color: AppColors.ink,
    fontFamily: FontFamily?.bold,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  storyCard: {
    minHeight: 260,
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.hero,
    overflow: 'hidden',
    ...Shadow.card,
  },
  storyGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#3D337D',
    right: -55,
    top: -68,
  },
  storyGlowTwo: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: '#274E63',
    right: 18,
    bottom: -70,
  },
  storyTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  storyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: AppColors.paper,
  },
  storyEyebrow: {
    color: '#C8C1FF',
    fontFamily: FontFamily?.medium,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  storyTitle: {
    color: AppColors.onDark,
    fontFamily: FontFamily?.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.7,
    marginTop: Spacing.xl,
    maxWidth: 300,
  },
  storyBody: {
    color: '#C9D0E0',
    fontFamily: FontFamily?.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackedAvatar: { borderRadius: Radius.full, borderWidth: 2, borderColor: AppColors.ink },
  avatarCount: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    minWidth: 48,
    paddingHorizontal: 9,
    borderRadius: Radius.full,
    backgroundColor: '#40378B',
    borderWidth: 2,
    borderColor: AppColors.ink,
  },
  avatarCountText: { color: AppColors.onDark, fontSize: 11, fontWeight: '700' },
  arrowButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: AppColors.violet,
  },
  quickGrid: { flexDirection: 'row', gap: Spacing.md },
  quickCard: { flex: 1, minHeight: 118, padding: Spacing.md, borderRadius: Radius.lg },
  quickIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  quickValue: { color: AppColors.ink, fontSize: 21, fontWeight: '700', lineHeight: 24 },
  quickLabel: { color: AppColors.inkMuted, fontSize: 12, marginTop: 2 },
  section: { gap: Spacing.md },
  listCard: {
    backgroundColor: AppColors.paper,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 76 },
  emptyEvent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 88 },
  eventIcon: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: Radius.md },
  eventCopy: { flex: 1 },
  eventTitle: { color: AppColors.ink, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  eventDetail: { color: AppColors.inkMuted, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 56 },
  memoryCard: {
    flexDirection: 'row',
    minHeight: 168,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
    ...Shadow.card,
  },
  memoryArtwork: {
    width: 118,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.violet,
    overflow: 'hidden',
  },
  memoryOrbLarge: {
    position: 'absolute',
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: '#8574F2',
    top: -28,
    left: -32,
  },
  memoryOrbSmall: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5140CE',
    right: -12,
    bottom: -12,
  },
  memoryCopy: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  memoryDate: { color: AppColors.violet, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  memoryTitle: { color: AppColors.ink, fontSize: 17, fontWeight: '700', marginTop: 4 },
  memoryDetail: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  memoryPeople: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  memoryPeopleText: { color: AppColors.inkMuted, fontSize: 11, fontWeight: '600', marginLeft: 8 },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  privateNoteText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
