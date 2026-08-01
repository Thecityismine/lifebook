import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/screen-title';
import { AppColors, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { chapters } from '@/data/demo';

export default function ChaptersScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Chapters" subtitle="The places and seasons that shape a life" actionIcon="search-outline" actionLabel="Search chapters" />
        <View style={styles.list}>
          {chapters.map((chapter) => (
            <Pressable
              key={chapter.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${chapter.title}`}
              style={({ pressed }) => [styles.chapterCard, pressed && styles.pressed]}>
              <View style={[styles.chapterArtwork, { backgroundColor: chapter.softColor }]}>
                <View style={[styles.artCircle, { backgroundColor: chapter.color }]} />
                <Ionicons name={chapter.icon} size={42} color={chapter.color} />
              </View>
              <View style={styles.chapterCopy}>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterDetail}>{chapter.detail}</Text>
                <View style={styles.stats}>
                  <Text style={styles.stat}>{chapter.memoryCount} memories</Text>
                  <View style={styles.dot} />
                  <Text style={styles.stat}>{chapter.peopleCount} people</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AppColors.slate} />
            </Pressable>
          ))}
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
    paddingTop: Spacing.lg,
    paddingBottom: 120,
    gap: Spacing.xxl,
  },
  list: { gap: Spacing.md },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 126,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  chapterArtwork: {
    width: 92,
    height: 96,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artCircle: { position: 'absolute', width: 64, height: 64, borderRadius: 32, opacity: 0.12 },
  chapterCopy: { flex: 1, paddingHorizontal: Spacing.lg },
  chapterTitle: { color: AppColors.ink, fontSize: 17, fontWeight: '700' },
  chapterDetail: { color: AppColors.inkMuted, fontSize: 12, marginTop: 4 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 7 },
  stat: { color: AppColors.slate, fontSize: 11, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: AppColors.line },
  pressed: { opacity: 0.64, transform: [{ scale: 0.99 }] },
});
