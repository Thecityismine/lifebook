import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ScreenTitle } from '@/components/screen-title';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { people } from '@/data/demo';

const filters = ['All', 'Family', 'Friends', 'School', 'Teams'];

export default function PeopleScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="People" subtitle="128 people in Steven’s LifeBook" actionIcon="ellipsis-horizontal" actionLabel="People options" />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={AppColors.slate} />
          <TextInput
            accessibilityLabel="Search people"
            placeholder="Search people"
            placeholderTextColor={AppColors.slate}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((filter, index) => (
            <Pressable key={filter} style={[styles.filter, index === 0 && styles.filterActive]}>
              <Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.peopleCard}>
          {people.map((person, index) => (
            <View key={person.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${person.name}`}
                style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
                <Avatar initials={person.initials} color={person.color} size={48} />
                <View style={styles.personCopy}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personDetail}>{person.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
              </Pressable>
              {index < people.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.privateNote}>
          <Ionicons name="shield-checkmark" size={18} color={AppColors.mint} />
          <Text style={styles.privateNoteText}>Only your family can see this directory.</Text>
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
    gap: Spacing.xl,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  searchInput: { flex: 1, color: AppColors.ink, fontSize: 15, fontFamily: FontFamily?.regular },
  filters: { gap: Spacing.sm, paddingRight: Spacing.xl },
  filter: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterActive: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  filterText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: AppColors.paper },
  peopleCard: {
    backgroundColor: AppColors.paper,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    ...Shadow.card,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', minHeight: 78, gap: Spacing.md },
  personCopy: { flex: 1 },
  personName: { color: AppColors.ink, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  personDetail: { color: AppColors.inkMuted, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 60 },
  privateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  privateNoteText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.58 },
});
