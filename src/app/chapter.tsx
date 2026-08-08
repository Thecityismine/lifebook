import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { chapterColor, chapterIcon } from '@/constants/chapters';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  chapterDateRangeLabel,
  setChapterArchived,
  subscribeToChapter,
  type ChapterRecord,
} from '@/services/chapters';
import { memoryDateLabel, subscribeToMemories, type MemoryRecord } from '@/services/memories';
import { confirmDestructiveAction } from '@/services/confirmation';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';

export default function ChapterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';
  const chapterId = typeof params.id === 'string' ? params.id : '';
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(chapterId));
  const [updatingArchive, setUpdatingArchive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId || !chapterId) {
      return;
    }
    return subscribeToChapter(
      familyId,
      chapterId,
      (nextChapter) => {
        setChapter(nextChapter);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [chapterId, familyId]);

  useEffect(() => {
    if (!familyId || !profileId) {
      return;
    }
    const unsubscribeMemories = subscribeToMemories(familyId, profileId, setMemories, setError);
    const unsubscribePeople = subscribeToPeople(familyId, setPeople, setError);
    return () => {
      unsubscribeMemories();
      unsubscribePeople();
    };
  }, [familyId, profileId]);

  const linkedMemories = useMemo(() => {
    if (!chapter) {
      return [];
    }
    const memoriesById = new Map(memories.map((memory) => [memory.id, memory]));
    return chapter.memoryIds
      .map((memoryId) => memoriesById.get(memoryId))
      .filter((memory): memory is MemoryRecord => Boolean(memory));
  }, [chapter, memories]);
  const linkedPeople = useMemo(() => {
    const personIds = new Set(linkedMemories.flatMap((memory) => memory.personIds));
    return people.filter((person) => personIds.has(person.id));
  }, [linkedMemories, people]);

  const updateArchive = async (archived: boolean) => {
    if (!familyId || !chapterId) {
      return;
    }
    setUpdatingArchive(true);
    setError('');
    const result = await setChapterArchived(familyId, chapterId, archived);
    setUpdatingArchive(false);
    if (!result.ok) {
      setError(result.message);
    }
  };

  const confirmArchive = () => {
    if (chapter?.archivedAt) {
      void updateArchive(false);
      return;
    }
    confirmDestructiveAction({
      title: 'Archive this chapter?',
      message: 'Its memories stay safe and remain in the main timeline. You can restore this chapter later.',
      onConfirm: () => void updateArchive(true),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={AppColors.violet} />
          <Text style={styles.helper}>Opening this private chapter…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chapter) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="book-outline" size={36} color={AppColors.slate} />
          <Text style={styles.sectionTitle}>This chapter could not be found</Text>
          <Text style={styles.helper}>{error || 'Return to Chapters and choose another part of the story.'}</Text>
          <Pressable onPress={() => router.replace('/chapters')} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Back to Chapters</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const visualColor = chapterColor(chapter.colorKey);
  const visualIcon = chapterIcon(chapter.iconKey);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Back to Chapters" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel={`Edit ${chapter.title}`}
            onPress={() => router.push({ pathname: '/edit-chapter', params: { id: chapter.id } })}
            style={styles.iconButton}>
            <Ionicons name="create-outline" size={23} color={AppColors.violet} />
          </Pressable>
        </View>

        <View style={[styles.hero, { backgroundColor: visualColor.softColor }]}>
          <View style={[styles.heroOrb, { backgroundColor: visualColor.color }]} />
          <Ionicons name={visualIcon.icon} size={62} color={visualColor.color} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: visualColor.color }]}>{visualIcon.label.toUpperCase()}</Text>
          <Text style={styles.title}>{chapter.title}</Text>
          <Text style={styles.dateRange}>{chapterDateRangeLabel(chapter)}</Text>
          {chapter.archivedAt ? (
            <View style={styles.archivedBadge}>
              <Ionicons name="archive-outline" size={15} color={AppColors.danger} />
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: AppColors.blushSoft }]}>
            <Text style={styles.statValue}>{linkedMemories.length}</Text>
            <Text style={styles.statLabel}>{linkedMemories.length === 1 ? 'Memory' : 'Memories'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: AppColors.skySoft }]}>
            <Text style={styles.statValue}>{linkedPeople.length}</Text>
            <Text style={styles.statLabel}>{linkedPeople.length === 1 ? 'Person' : 'People'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About this chapter</Text>
          <Text style={chapter.description ? styles.description : styles.emptyValue}>
            {chapter.description || 'No description was added yet. Edit this chapter whenever more details come back.'}
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Memories</Text>
            <Text style={styles.helper}>The moments collected in this chapter.</Text>
          </View>
          <Pressable
            accessibilityLabel={`Edit memories in ${chapter.title}`}
            onPress={() => router.push({ pathname: '/edit-chapter', params: { id: chapter.id } })}
            style={styles.smallAction}>
            <Ionicons name="add" size={18} color={AppColors.violet} />
            <Text style={styles.smallActionText}>Manage</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {linkedMemories.length === 0 ? (
            <Text style={styles.emptyValue}>No memories are linked yet. Use Manage to choose moments for this chapter.</Text>
          ) : linkedMemories.map((memory, index) => (
            <View key={memory.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open memory: ${memory.title}`}
                onPress={() => router.push({ pathname: '/memory', params: { id: memory.id } })}
                style={({ pressed }) => [styles.memoryRow, pressed && styles.pressed]}>
                <View style={[styles.memoryIcon, { backgroundColor: AppColors.blushSoft }]}>
                  <Ionicons name="heart" size={20} color={AppColors.blush} />
                </View>
                <View style={styles.memoryCopy}>
                  <Text style={styles.memoryTitle}>{memory.title}</Text>
                  <Text style={styles.memoryDate}>{memoryDateLabel(memory.occurredOn)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
              </Pressable>
              {index < linkedMemories.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        {linkedPeople.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>People in this chapter</Text>
            <View style={styles.peopleGrid}>
              {linkedPeople.map((person) => (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${personDisplayName(person)}`}
                  onPress={() => router.push({ pathname: '/person', params: { id: person.id } })}
                  style={({ pressed }) => [styles.personChip, pressed && styles.pressed]}>
                  <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={AppColors.sky} size={34} />
                  <Text style={styles.personName} numberOfLines={1}>{personDisplayName(person)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={19} color={AppColors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={updatingArchive}
          onPress={confirmArchive}
          style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>
          {updatingArchive ? <ActivityIndicator color={chapter.archivedAt ? AppColors.violet : AppColors.danger} /> : (
            <>
              <Ionicons name={chapter.archivedAt ? 'refresh' : 'archive-outline'} size={19} color={chapter.archivedAt ? AppColors.violet : AppColors.danger} />
              <Text style={[styles.archiveText, chapter.archivedAt && styles.restoreText]}>
                {chapter.archivedAt ? 'Restore to Chapters' : 'Archive chapter'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  hero: { minHeight: 260, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Radius.xl, ...Shadow.card },
  heroOrb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, opacity: 0.13 },
  titleBlock: { alignItems: 'flex-start', gap: Spacing.sm },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 32, lineHeight: 39, fontWeight: '700' },
  dateRange: { color: AppColors.inkMuted, fontSize: 14, fontWeight: '600' },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft },
  archivedBadgeText: { color: AppColors.danger, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, minHeight: 100, justifyContent: 'center', padding: Spacing.lg, borderRadius: Radius.lg },
  statValue: { color: AppColors.ink, fontSize: 25, fontWeight: '800' },
  statLabel: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  card: { padding: Spacing.xl, gap: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  description: { color: AppColors.ink, fontSize: 15, lineHeight: 24 },
  emptyValue: { color: AppColors.slate, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.md },
  sectionCopy: { flex: 1, gap: 3 },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 40, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  smallActionText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 62 },
  memoryIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  memoryCopy: { flex: 1 },
  memoryTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  memoryDate: { color: AppColors.inkMuted, fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 56 },
  peopleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  personChip: { maxWidth: '48%', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.md, paddingVertical: 4, paddingLeft: 4, borderRadius: Radius.full, backgroundColor: AppColors.skySoft },
  personName: { flexShrink: 1, color: AppColors.ink, fontSize: 12, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 52, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.paper },
  archiveText: { color: AppColors.danger, fontSize: 14, fontWeight: '700' },
  restoreText: { color: AppColors.violet },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  primaryAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet },
  primaryActionText: { color: AppColors.onAccent, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
