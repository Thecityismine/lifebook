import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ScreenTitle } from '@/components/screen-title';
import { AppColors, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { memories } from '@/data/demo';

export default function MemoriesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Memories" subtitle="23 moments worth keeping" actionIcon="search-outline" actionLabel="Search memories" />
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {memories.map((memory) => (
            <View key={memory.id} style={styles.timelineRow}>
              <View style={styles.dateBlock}>
                <Text style={styles.month}>{memory.month}</Text>
                <Text style={styles.day}>{memory.day}</Text>
              </View>
              <View style={[styles.timelineDot, { backgroundColor: memory.color }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open memory: ${memory.title}`}
                style={({ pressed }) => [styles.memoryCard, pressed && styles.pressed]}>
                <View style={[styles.memoryIcon, { backgroundColor: memory.softColor }]}>
                  <Ionicons name={memory.icon} size={23} color={memory.color} />
                </View>
                <Text style={styles.memoryTitle}>{memory.title}</Text>
                <Text style={styles.memoryDetail}>{memory.detail}</Text>
                <View style={styles.peopleRow}>
                  {memory.people.map((initials, index) => (
                    <View key={initials} style={{ marginLeft: index === 0 ? 0 : -6 }}>
                      <Avatar
                        initials={initials}
                        size={26}
                        color={index % 2 === 0 ? AppColors.sky : AppColors.mint}
                      />
                    </View>
                  ))}
                  <Text style={styles.peopleText}>{memory.people.length} {memory.people.length === 1 ? 'person' : 'people'}</Text>
                </View>
              </Pressable>
            </View>
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
  timeline: { position: 'relative', gap: Spacing.lg },
  timelineLine: { position: 'absolute', left: 50, top: 26, bottom: 26, width: 2, backgroundColor: AppColors.line },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dateBlock: { width: 40, alignItems: 'center', paddingTop: 11 },
  month: { color: AppColors.violet, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  day: { color: AppColors.ink, fontSize: 18, fontWeight: '700', marginTop: 1 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 4,
    marginRight: 14,
    marginTop: 21,
    borderWidth: 3,
    borderColor: AppColors.cloud,
  },
  memoryCard: {
    flex: 1,
    minHeight: 166,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  memoryIcon: { alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: Radius.md },
  memoryTitle: { color: AppColors.ink, fontSize: 16, fontWeight: '700', marginTop: Spacing.md },
  memoryDetail: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  peopleRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  peopleText: { color: AppColors.slate, fontSize: 11, fontWeight: '600', marginLeft: 8 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
});
