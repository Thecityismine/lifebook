import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ScreenTitle } from '@/components/screen-title';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { memoryDateLabel, subscribeToMemories, type MemoryRecord } from '@/services/memories';
import { personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';

const filters = ['Timeline', 'Archived'] as const;
type MemoryFilter = typeof filters[number];

export default function MemoriesScreen() {
  const router = useRouter();
  const { setup } = useAuthSession();
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemoryFilter>('Timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setup?.familyId || !setup.activeProfileId) {
      return;
    }
    const unsubscribeMemories = subscribeToMemories(
      setup.familyId,
      setup.activeProfileId,
      (nextMemories) => {
        setMemories(nextMemories);
        setLoading(false);
        setError('');
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
    const unsubscribePeople = subscribeToPeople(setup.familyId, setPeople, setError);
    return () => {
      unsubscribeMemories();
      unsubscribePeople();
    };
  }, [setup?.activeProfileId, setup?.familyId]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const visibleMemories = useMemo(() => {
    const searchKey = search.trim().toLocaleLowerCase();
    return memories.filter((memory) => {
      const archived = memory.archivedAt !== null;
      if ((filter === 'Archived') !== archived) {
        return false;
      }
      if (!searchKey) {
        return true;
      }
      const peopleNames = memory.personIds.map((personId) => {
        const person = peopleById.get(personId);
        return person ? `${person.firstName} ${person.lastName}` : '';
      });
      return [memory.title, memory.story, memory.occurredOn, ...peopleNames]
        .join(' ')
        .toLocaleLowerCase()
        .includes(searchKey);
    });
  }, [filter, memories, peopleById, search]);
  const activeCount = memories.filter((memory) => !memory.archivedAt).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          title="Memories"
          subtitle={`${activeCount} ${activeCount === 1 ? 'moment' : 'moments'} in this private timeline`}
          actionIcon="ellipsis-horizontal"
          actionLabel="Add a memory"
          onAction={() => router.push('/edit-memory')}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={AppColors.slate} />
          <TextInput
            accessibilityLabel="Search memories"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search titles, stories, dates, or people"
            placeholderTextColor={AppColors.slate}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear memory search" onPress={() => setSearch('')} hitSlop={10}>
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
            <Text style={styles.stateTitle}>Opening your private timeline…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={AppColors.danger} />
            <Text style={styles.stateTitle}>Memories are unavailable</Text>
            <Text style={styles.stateDetail}>{error}</Text>
          </View>
        ) : visibleMemories.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={31} color={AppColors.blush} />
            </View>
            <Text style={styles.stateTitle}>{memories.length === 0 ? 'Save the first memory' : 'No memories match this view'}</Text>
            <Text style={styles.stateDetail}>
              {memories.length === 0
                ? 'Keep a story, photo, or small moment and connect the people who were there.'
                : 'Try another search or switch timeline filters.'}
            </Text>
            {memories.length === 0 ? (
              <Pressable onPress={() => router.push('/edit-memory')} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Ionicons name="heart" size={19} color={AppColors.onAccent} />
                <Text style={styles.addButtonText}>Add first memory</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.timelineLine} />
            {visibleMemories.map((memory) => {
              const [, month, day] = memory.occurredOn.split('-');
              const linkedPeople = memory.personIds
                .map((personId) => peopleById.get(personId))
                .filter((person): person is PersonRecord => Boolean(person));
              return (
                <View key={memory.id} style={styles.timelineRow}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.month}>{memoryDateLabel(memory.occurredOn, 'short').split(' ')[0].toUpperCase()}</Text>
                    <Text style={styles.day}>{Number(day) || day || month}</Text>
                  </View>
                  <View style={styles.timelineDot} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open memory: ${memory.title}`}
                    onPress={() => router.push({ pathname: '/memory', params: { id: memory.id } })}
                    style={({ pressed }) => [styles.memoryCard, pressed && styles.pressed]}>
                    {memory.photoUrl ? (
                      <Image source={{ uri: memory.photoUrl }} resizeMode="cover" style={styles.memoryImage} />
                    ) : (
                      <View style={styles.memoryIcon}>
                        <Ionicons name="sparkles" size={23} color={AppColors.blush} />
                      </View>
                    )}
                    <Text style={styles.memoryTitle}>{memory.title}</Text>
                    {memory.story ? <Text style={styles.memoryDetail} numberOfLines={3}>{memory.story}</Text> : null}
                    <View style={styles.peopleRow}>
                      {linkedPeople.slice(0, 3).map((person, index) => (
                        <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -6 }}>
                          <Avatar initials={personInitials(person)} imageUri={person.photoUrl} size={27} color={index % 2 === 0 ? AppColors.sky : AppColors.mint} />
                        </View>
                      ))}
                      <Text style={styles.peopleText}>
                        {linkedPeople.length === 0 ? 'No people linked' : `${linkedPeople.length} ${linkedPeople.length === 1 ? 'person' : 'people'}`}
                      </Text>
                      {memory.archivedAt ? <Text style={styles.archivedLabel}>Archived</Text> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.privateNote}>
          <Ionicons name="shield-checkmark" size={18} color={AppColors.mint} />
          <Text style={styles.privateNoteText}>Only verified members of your family can see this timeline.</Text>
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
  timeline: { position: 'relative', gap: Spacing.lg },
  timelineLine: { position: 'absolute', left: 50, top: 26, bottom: 26, width: 2, backgroundColor: AppColors.line },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dateBlock: { width: 40, alignItems: 'center', paddingTop: 11 },
  month: { color: AppColors.violet, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  day: { color: AppColors.ink, fontSize: 18, fontWeight: '700', marginTop: 1 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginLeft: 4, marginRight: 14, marginTop: 21, backgroundColor: AppColors.blush, borderWidth: 3, borderColor: AppColors.cloud },
  memoryCard: { flex: 1, minHeight: 166, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  memoryImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.md, marginBottom: Spacing.md, backgroundColor: AppColors.blushSoft },
  memoryIcon: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  memoryTitle: { color: AppColors.ink, fontSize: 16, fontWeight: '700', marginTop: Spacing.md },
  memoryDetail: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  peopleRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  peopleText: { flex: 1, color: AppColors.slate, fontSize: 11, fontWeight: '600', marginLeft: 8 },
  archivedLabel: { color: AppColors.danger, fontSize: 11, fontWeight: '700' },
  stateCard: { alignItems: 'center', justifyContent: 'center', minHeight: 250, padding: Spacing.xxl, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  emptyIcon: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft },
  stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateDetail: { color: AppColors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 390 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet },
  addButtonText: { color: AppColors.onAccent, fontSize: 14, fontWeight: '700' },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  privateNoteText: { flex: 1, color: AppColors.inkMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.99 }] },
});
