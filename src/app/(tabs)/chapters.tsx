import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/screen-title';
import { chapterColor, chapterIcon } from '@/constants/chapters';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { chapterDateRangeLabel, subscribeToChapters, type ChapterRecord } from '@/services/chapters';
import { subscribeToMemories, type MemoryRecord } from '@/services/memories';

const filters = ['Current', 'Archived'] as const;
type ChapterFilter = typeof filters[number];

export default function ChaptersScreen() {
  const router = useRouter();
  const { setup } = useAuthSession();
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ChapterFilter>('Current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setup?.familyId || !setup.activeProfileId) {
      return;
    }
    const unsubscribeChapters = subscribeToChapters(
      setup.familyId,
      setup.activeProfileId,
      (nextChapters) => {
        setChapters(nextChapters);
        setLoading(false);
        setError('');
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
    const unsubscribeMemories = subscribeToMemories(setup.familyId, setup.activeProfileId, setMemories, setError);
    return () => {
      unsubscribeChapters();
      unsubscribeMemories();
    };
  }, [setup?.activeProfileId, setup?.familyId]);

  const memoriesById = useMemo(() => new Map(memories.map((memory) => [memory.id, memory])), [memories]);
  const visibleChapters = useMemo(() => {
    const searchKey = search.trim().toLocaleLowerCase();
    return chapters.filter((chapter) => {
      const archived = chapter.archivedAt !== null;
      if ((filter === 'Archived') !== archived) {
        return false;
      }
      if (!searchKey) {
        return true;
      }
      const memoryTitles = chapter.memoryIds.map((memoryId) => memoriesById.get(memoryId)?.title || '');
      return [chapter.title, chapter.description, chapter.startsOn, chapter.endsOn, ...memoryTitles]
        .join(' ')
        .toLocaleLowerCase()
        .includes(searchKey);
    });
  }, [chapters, filter, memoriesById, search]);
  const activeCount = chapters.filter((chapter) => !chapter.archivedAt).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          title="Chapters"
          subtitle={`${activeCount} ${activeCount === 1 ? 'chapter' : 'chapters'} shaping this private LifeBook`}
          actionIcon="ellipsis-horizontal"
          actionLabel="Add a chapter"
          onAction={() => router.push('/edit-chapter')}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={AppColors.slate} />
          <TextInput
            accessibilityLabel="Search chapters"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search titles, details, dates, or memories"
            placeholderTextColor={AppColors.slate}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear chapter search" onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={AppColors.slate} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {filters.map((filterOption) => {
            const active = filterOption === filter;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={filterOption}
                onPress={() => setFilter(filterOption)}
                style={[styles.filter, active && styles.filterActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filterOption}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={AppColors.violet} />
            <Text style={styles.stateTitle}>Opening your private chapters…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={AppColors.danger} />
            <Text style={styles.stateTitle}>Chapters are unavailable</Text>
            <Text style={styles.stateDetail}>{error}</Text>
          </View>
        ) : visibleChapters.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="book-outline" size={31} color={AppColors.violet} />
            </View>
            <Text style={styles.stateTitle}>{chapters.length === 0 ? 'Begin the first chapter' : 'No chapters match this view'}</Text>
            <Text style={styles.stateDetail}>
              {chapters.length === 0
                ? 'Gather memories into a season, place, activity, school year, or milestone.'
                : 'Try another search or switch chapter filters.'}
            </Text>
            {chapters.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/edit-chapter')}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Ionicons name="book" size={19} color={AppColors.onAccent} />
                <Text style={styles.addButtonText}>Add first chapter</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {visibleChapters.map((chapter) => {
              const visualColor = chapterColor(chapter.colorKey);
              const visualIcon = chapterIcon(chapter.iconKey);
              const linkedMemories = chapter.memoryIds
                .map((memoryId) => memoriesById.get(memoryId))
                .filter((memory): memory is MemoryRecord => Boolean(memory));
              const peopleCount = new Set(linkedMemories.flatMap((memory) => memory.personIds)).size;
              return (
                <Pressable
                  key={chapter.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${chapter.title}`}
                  onPress={() => router.push({ pathname: '/chapter', params: { id: chapter.id } })}
                  style={({ pressed }) => [styles.chapterCard, pressed && styles.pressed]}>
                  <View style={[styles.chapterArtwork, { backgroundColor: visualColor.softColor }]}>
                    <View style={[styles.artCircle, { backgroundColor: visualColor.color }]} />
                    <Ionicons name={visualIcon.icon} size={42} color={visualColor.color} />
                  </View>
                  <View style={styles.chapterCopy}>
                    <View style={styles.chapterTitleRow}>
                      <Text style={styles.chapterTitle} numberOfLines={1}>{chapter.title}</Text>
                      {chapter.archivedAt ? <Text style={styles.archivedLabel}>Archived</Text> : null}
                    </View>
                    <Text style={styles.chapterDetail} numberOfLines={1}>{chapterDateRangeLabel(chapter)}</Text>
                    <View style={styles.stats}>
                      <Text style={styles.stat}>{linkedMemories.length} {linkedMemories.length === 1 ? 'memory' : 'memories'}</Text>
                      <View style={styles.dot} />
                      <Text style={styles.stat}>{peopleCount} {peopleCount === 1 ? 'person' : 'people'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={AppColors.slate} />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.privateNote}>
          <Ionicons name="shield-checkmark" size={18} color={AppColors.mint} />
          <Text style={styles.privateNoteText}>Only verified members of your family can see these chapters.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 120, gap: Spacing.xl },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  searchInput: { flex: 1, color: AppColors.ink, fontSize: 15, fontFamily: FontFamily?.regular },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  filter: { alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  filterActive: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  filterText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: AppColors.onAccent },
  list: { gap: Spacing.md },
  chapterCard: { flexDirection: 'row', alignItems: 'center', minHeight: 126, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  chapterArtwork: { width: 92, height: 96, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artCircle: { position: 'absolute', width: 64, height: 64, borderRadius: 32, opacity: 0.12 },
  chapterCopy: { flex: 1, paddingHorizontal: Spacing.lg },
  chapterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chapterTitle: { flex: 1, color: AppColors.ink, fontSize: 17, fontWeight: '700' },
  archivedLabel: { color: AppColors.danger, fontSize: 10, fontWeight: '700' },
  chapterDetail: { color: AppColors.inkMuted, fontSize: 12, marginTop: 4 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 7 },
  stat: { color: AppColors.slate, fontSize: 11, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: AppColors.line },
  stateCard: { alignItems: 'center', justifyContent: 'center', minHeight: 250, padding: Spacing.xxl, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateDetail: { color: AppColors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 390 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet },
  addButtonText: { color: AppColors.onAccent, fontSize: 14, fontWeight: '700' },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  privateNoteText: { flex: 1, color: AppColors.inkMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.64, transform: [{ scale: 0.99 }] },
});
