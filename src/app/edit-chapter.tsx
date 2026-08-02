import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import {
  CHAPTER_COLOR_OPTIONS,
  CHAPTER_ICON_OPTIONS,
  chapterColor,
  chapterIcon,
} from '@/constants/chapters';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  saveChapter,
  subscribeToChapter,
  type ChapterColorKey,
  type ChapterIconKey,
} from '@/services/chapters';
import { memoryDateLabel, subscribeToMemories, type MemoryRecord } from '@/services/memories';

function validOptionalDate(value: string) {
  if (!value) {
    return true;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export default function EditChapterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; memoryId?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';
  const requestedChapterId = typeof params.id === 'string' ? params.id : '';
  const initialMemoryId = typeof params.memoryId === 'string' ? params.memoryId : '';
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [iconKey, setIconKey] = useState<ChapterIconKey>('milestone');
  const [colorKey, setColorKey] = useState<ChapterColorKey>('violet');
  const [memoryIds, setMemoryIds] = useState<string[]>(initialMemoryId ? [initialMemoryId] : []);
  const [loading, setLoading] = useState(Boolean(requestedChapterId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const visibleMemories = useMemo(
    () => memories.filter((memory) => !memory.archivedAt || memoryIds.includes(memory.id)),
    [memories, memoryIds],
  );
  const selectedIcon = chapterIcon(iconKey);
  const selectedColor = chapterColor(colorKey);

  useEffect(() => {
    if (!familyId || !profileId) {
      return;
    }
    return subscribeToMemories(familyId, profileId, setMemories, setError);
  }, [familyId, profileId]);

  useEffect(() => {
    if (!familyId || !requestedChapterId) {
      return;
    }
    return subscribeToChapter(
      familyId,
      requestedChapterId,
      (nextChapter) => {
        if (nextChapter) {
          setTitle(nextChapter.title);
          setDescription(nextChapter.description);
          setStartsOn(nextChapter.startsOn);
          setEndsOn(nextChapter.endsOn);
          setIconKey(nextChapter.iconKey);
          setColorKey(nextChapter.colorKey);
          setMemoryIds(nextChapter.memoryIds);
        }
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [familyId, requestedChapterId]);

  const toggleMemory = (memoryId: string) => {
    setMemoryIds((current) => current.includes(memoryId)
      ? current.filter((id) => id !== memoryId)
      : [...current, memoryId].slice(0, 100));
  };

  const handleSave = async () => {
    if (!familyId || !profileId) {
      setError('Your active private LifeBook profile is not available right now.');
      return;
    }
    if (!title.trim()) {
      setError('Give this chapter a title.');
      return;
    }
    const cleanStart = startsOn.trim();
    const cleanEnd = endsOn.trim();
    if (!validOptionalDate(cleanStart) || !validOptionalDate(cleanEnd)) {
      setError('Use real dates in YYYY-MM-DD format, or leave them blank.');
      return;
    }
    if (cleanStart && cleanEnd && cleanEnd < cleanStart) {
      setError('The end date must be on or after the start date.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await saveChapter(
      familyId,
      profileId,
      { title, description, startsOn, endsOn, iconKey, colorKey, memoryIds },
      requestedChapterId || undefined,
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace({ pathname: '/chapter', params: { id: result.chapterId } });
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{requestedChapterId ? 'Edit chapter' : 'New chapter'}</Text>
              <Text style={styles.title}>{requestedChapterId ? 'Shape this part of the story' : 'Begin a new part of the story'}</Text>
            </View>
          </View>

          <View style={[styles.preview, { backgroundColor: selectedColor.softColor }]}>
            <View style={[styles.previewOrb, { backgroundColor: selectedColor.color }]} />
            <Ionicons name={selectedIcon.icon} size={52} color={selectedColor.color} />
            <Text style={[styles.previewLabel, { color: selectedColor.color }]}>{title.trim() || 'New chapter'}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>About this chapter</Text>
            <FormField label="Title" placeholder="Fifth grade" maxLength={120} value={title} onChangeText={setTitle} />
            <FormField
              label="Description (optional)"
              placeholder="What makes this season or milestone meaningful?"
              maxLength={3000}
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <FormField label="Start (optional)" placeholder="YYYY-MM-DD" maxLength={10} value={startsOn} onChangeText={setStartsOn} />
              </View>
              <View style={styles.dateField}>
                <FormField label="End (optional)" placeholder="YYYY-MM-DD" maxLength={10} value={endsOn} onChangeText={setEndsOn} />
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Chapter style</Text>
            <Text style={styles.helper}>Choose the symbol and color that make this chapter easy to recognize.</Text>
            <View style={styles.optionGrid}>
              {CHAPTER_ICON_OPTIONS.map((option) => {
                const selected = option.key === iconKey;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setIconKey(option.key)}
                    style={[styles.iconOption, selected && styles.iconOptionSelected]}>
                    <Ionicons name={option.icon} size={22} color={selected ? AppColors.onAccent : AppColors.violet} />
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.colorRow}>
              {CHAPTER_COLOR_OPTIONS.map((option) => {
                const selected = option.key === colorKey;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setColorKey(option.key)}
                    style={[styles.colorOption, { backgroundColor: option.color }, selected && styles.colorOptionSelected]}>
                    {selected ? <Ionicons name="checkmark" size={19} color={AppColors.onAccent} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Memories in this chapter</Text>
                <Text style={styles.helper}>Choose the moments that belong in this part of the story.</Text>
              </View>
              <Text style={styles.selectionCount}>{memoryIds.length}/100</Text>
            </View>
            {visibleMemories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.helper}>Save a memory first, then return to build this chapter.</Text>
                <Pressable onPress={() => router.push('/edit-memory')} style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>Add a memory</Text>
                </Pressable>
              </View>
            ) : visibleMemories.map((memory, index) => {
              const selected = memoryIds.includes(memory.id);
              return (
                <View key={memory.id}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleMemory(memory.id)}
                    style={({ pressed }) => [styles.memoryRow, pressed && styles.pressed]}>
                    <View style={[styles.memoryIcon, { backgroundColor: AppColors.blushSoft }]}>
                      <Ionicons name="heart" size={19} color={AppColors.blush} />
                    </View>
                    <View style={styles.memoryCopy}>
                      <Text style={styles.memoryTitle}>{memory.title}</Text>
                      <Text style={styles.memoryDate}>{memoryDateLabel(memory.occurredOn)}</Text>
                    </View>
                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={selected ? AppColors.violet : AppColors.slate} />
                  </Pressable>
                  {index < visibleMemories.length - 1 ? <View style={styles.divider} /> : null}
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

          <PrimaryButton
            label={requestedChapterId ? 'Save changes' : 'Save chapter'}
            icon="book"
            loading={saving}
            onPress={() => void handleSave()}
          />
          <View style={styles.privateNote}>
            <Ionicons name="lock-closed" size={15} color={AppColors.mint} />
            <Text style={styles.privateNoteText}>Private to verified members of your family</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  headerCopy: { flex: 1 },
  iconButton: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  eyebrow: { color: AppColors.violet, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 25, fontWeight: '700', marginTop: 3 },
  preview: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, overflow: 'hidden', borderRadius: Radius.xl, ...Shadow.card },
  previewOrb: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.12 },
  previewLabel: { fontSize: 20, fontWeight: '800' },
  formCard: { padding: Spacing.xl, gap: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateField: { flex: 1 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconOption: { width: '31%', minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: Radius.md, backgroundColor: AppColors.violetSoft, borderWidth: 1, borderColor: AppColors.violetSoft },
  iconOptionSelected: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  optionText: { color: AppColors.violet, fontSize: 11, fontWeight: '700' },
  optionTextSelected: { color: AppColors.onAccent },
  colorRow: { flexDirection: 'row', gap: Spacing.md },
  colorOption: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, borderWidth: 3, borderColor: AppColors.onAccent },
  colorOptionSelected: { borderColor: AppColors.ink },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  sectionCopy: { flex: 1, gap: 3 },
  selectionCount: { color: AppColors.violet, fontSize: 12, fontWeight: '800', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 58 },
  memoryIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  memoryCopy: { flex: 1 },
  memoryTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  memoryDate: { color: AppColors.inkMuted, fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 54 },
  emptyState: { alignItems: 'flex-start', gap: Spacing.md },
  inlineButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.violetSoft },
  inlineButtonText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  privateNoteText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  pressed: { opacity: 0.6 },
});
