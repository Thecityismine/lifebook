import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/screen-title';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';

const actions = [
  { title: 'Memory', detail: 'Save a story, photo, or moment', icon: 'heart' as const, color: AppColors.blush, soft: AppColors.blushSoft },
  { title: 'Person', detail: 'Add someone important', icon: 'person-add' as const, color: AppColors.sky, soft: AppColors.skySoft },
  { title: 'Chapter', detail: 'Start a new part of the story', icon: 'book' as const, color: AppColors.violet, soft: AppColors.violetSoft },
  { title: 'Reminder', detail: 'Remember a birthday or moment', icon: 'notifications' as const, color: AppColors.sun, soft: AppColors.sunSoft },
];

export default function AddScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <ScreenTitle eyebrow="Add to LifeBook" title="What would you like to keep?" subtitle="Everything stays private to your family unless you decide otherwise." />
        <View style={styles.grid}>
          {actions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={`Add ${action.title}`}
              onPress={() => {
                if (action.title === 'Person') {
                  router.push('/edit-person');
                }
              }}
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
              <View style={[styles.actionIcon, { backgroundColor: action.soft }]}>
                <Ionicons name={action.icon} size={27} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
              <Ionicons name="arrow-forward-circle" size={24} color={action.color} style={styles.actionArrow} />
            </Pressable>
          ))}
        </View>
      </View>
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
    gap: Spacing.xxxl,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionCard: {
    width: '48%',
    minHeight: 190,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  actionIcon: { alignItems: 'center', justifyContent: 'center', width: 50, height: 50, borderRadius: Radius.md },
  actionTitle: {
    color: AppColors.ink,
    fontFamily: FontFamily?.bold,
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  actionDetail: { color: AppColors.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 4, paddingRight: 8 },
  actionArrow: { position: 'absolute', right: Spacing.lg, bottom: Spacing.lg },
  pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
});
