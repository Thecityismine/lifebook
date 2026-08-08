import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { chapterColor, chapterIcon } from '@/constants/chapters';
import { subscribeToChapters, type ChapterRecord } from '@/services/chapters';
import { confirmDestructiveAction } from '@/services/confirmation';
import { memoryDateLabel, setMemoryArchived, subscribeToMemory, type MemoryRecord } from '@/services/memories';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';

export default function MemoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';
  const memoryId = typeof params.id === 'string' ? params.id : '';
  const [memory, setMemory] = useState<MemoryRecord | null>(null);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(memoryId));
  const [updatingArchive, setUpdatingArchive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId || !memoryId) {
      return;
    }
    return subscribeToMemory(
      familyId,
      memoryId,
      (nextMemory) => {
        setMemory(nextMemory);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [familyId, memoryId]);

  useEffect(() => {
    if (!familyId) {
      return;
    }
    return subscribeToPeople(familyId, setPeople, setError);
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !profileId) {
      return;
    }
    return subscribeToChapters(familyId, profileId, setChapters, setError);
  }, [familyId, profileId]);

  const linkedPeople = useMemo(() => memory
    ? memory.personIds.map((personId) => people.find((person) => person.id === personId)).filter((person): person is PersonRecord => Boolean(person))
    : [], [memory, people]);
  const relatedChapters = useMemo(
    () => chapters.filter((chapter) => !chapter.archivedAt && chapter.memoryIds.includes(memoryId)),
    [chapters, memoryId],
  );

  const updateArchive = async (archived: boolean) => {
    if (!familyId || !memoryId) {
      return;
    }
    setUpdatingArchive(true);
    setError('');
    const result = await setMemoryArchived(familyId, memoryId, archived);
    setUpdatingArchive(false);
    if (!result.ok) {
      setError(result.message);
    }
  };

  const confirmArchive = () => {
    if (memory?.archivedAt) {
      void updateArchive(false);
      return;
    }
    confirmDestructiveAction({
      title: 'Archive this memory?',
      message: 'The story and its photo stay safe. You can restore it from the Archived filter.',
      onConfirm: () => void updateArchive(true),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={AppColors.violet} />
          <Text style={styles.helper}>Opening this private memory…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!memory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="heart-outline" size={36} color={AppColors.slate} />
          <Text style={styles.sectionTitle}>This memory could not be found</Text>
          <Text style={styles.helper}>{error || 'Return to the timeline and choose another memory.'}</Text>
          <Pressable onPress={() => router.replace('/memories')} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Back to Memories</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Back to Memories" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel={`Edit ${memory.title}`}
            onPress={() => router.push({ pathname: '/edit-memory', params: { id: memory.id } })}
            style={styles.iconButton}>
            <Ionicons name="create-outline" size={23} color={AppColors.violet} />
          </Pressable>
        </View>

        {memory.photoUrl ? (
          <Image source={{ uri: memory.photoUrl }} resizeMode="cover" style={styles.heroImage} />
        ) : (
          <View style={styles.heroArtwork}>
            <View style={styles.orbOne} />
            <View style={styles.orbTwo} />
            <Ionicons name="sparkles" size={46} color={AppColors.onAccent} />
          </View>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.date}>{memoryDateLabel(memory.occurredOn).toUpperCase()}</Text>
          <Text style={styles.title}>{memory.title}</Text>
          {memory.archivedAt ? (
            <View style={styles.archivedBadge}>
              <Ionicons name="archive-outline" size={15} color={AppColors.danger} />
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>The story</Text>
          <Text style={memory.story ? styles.story : styles.emptyValue}>
            {memory.story || 'No story was added yet. Edit this memory whenever more details come back.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>People in this memory</Text>
          {linkedPeople.length === 0 ? (
            <Text style={styles.emptyValue}>No one is linked yet.</Text>
          ) : linkedPeople.map((person, index) => (
            <View key={person.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${personDisplayName(person)}`}
                onPress={() => router.push({ pathname: '/person', params: { id: person.id } })}
                style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
                <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={AppColors.sky} size={44} />
                <View style={styles.personCopy}>
                  <Text style={styles.personName}>{personDisplayName(person)}</Text>
                  <Text style={styles.helper}>{person.archivedAt ? 'Archived person' : 'Part of this moment'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
              </Pressable>
              {index < linkedPeople.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View style={styles.cardHeadingCopy}>
              <Text style={styles.sectionTitle}>Chapters</Text>
              <Text style={styles.cardHelper}>The parts of the story that include this memory.</Text>
            </View>
            <Pressable
              accessibilityLabel="Create a chapter with this memory"
              onPress={() => router.push({ pathname: '/edit-chapter', params: { memoryId: memory.id } })}
              style={styles.smallAction}>
              <Ionicons name="add" size={18} color={AppColors.violet} />
              <Text style={styles.smallActionText}>New</Text>
            </Pressable>
          </View>
          {relatedChapters.length === 0 ? (
            <Text style={styles.emptyValue}>This memory is not part of a chapter yet.</Text>
          ) : relatedChapters.map((chapter, index) => {
            const visualColor = chapterColor(chapter.colorKey);
            const visualIcon = chapterIcon(chapter.iconKey);
            return (
              <View key={chapter.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open chapter: ${chapter.title}`}
                  onPress={() => router.push({ pathname: '/chapter', params: { id: chapter.id } })}
                  style={({ pressed }) => [styles.chapterRow, pressed && styles.pressed]}>
                  <View style={[styles.chapterIcon, { backgroundColor: visualColor.softColor }]}>
                    <Ionicons name={visualIcon.icon} size={20} color={visualColor.color} />
                  </View>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
                </Pressable>
                {index < relatedChapters.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            );
          })}
        </View>

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
          {updatingArchive ? <ActivityIndicator color={memory.archivedAt ? AppColors.violet : AppColors.danger} /> : (
            <>
              <Ionicons name={memory.archivedAt ? 'refresh' : 'archive-outline'} size={19} color={memory.archivedAt ? AppColors.violet : AppColors.danger} />
              <Text style={[styles.archiveText, memory.archivedAt && styles.restoreText]}>
                {memory.archivedAt ? 'Restore to Memories' : 'Archive memory'}
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
  heroImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.xl, backgroundColor: AppColors.blushSoft, ...Shadow.card },
  heroArtwork: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Radius.xl, backgroundColor: AppColors.violet },
  orbOne: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -52, top: -74, backgroundColor: '#8274F0' },
  orbTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, left: -35, bottom: -70, backgroundColor: '#4A9BF7' },
  titleBlock: { alignItems: 'flex-start', gap: Spacing.sm },
  date: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 32, lineHeight: 39, fontWeight: '700' },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft },
  archivedBadgeText: { color: AppColors.danger, fontSize: 12, fontWeight: '700' },
  card: { padding: Spacing.xl, gap: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  story: { color: AppColors.ink, fontSize: 15, lineHeight: 24 },
  emptyValue: { color: AppColors.slate, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  cardHeadingCopy: { flex: 1, gap: 3 },
  cardHelper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 38, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  smallActionText: { color: AppColors.violet, fontSize: 12, fontWeight: '700' },
  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 54 },
  chapterIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  chapterTitle: { flex: 1, color: AppColors.ink, fontSize: 14, fontWeight: '700' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56 },
  personCopy: { flex: 1 },
  personName: { color: AppColors.ink, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 56 },
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
