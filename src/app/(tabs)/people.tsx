import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ScreenTitle } from '@/components/screen-title';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  personDisplayName,
  personInitials,
  STANDARD_PERSON_TAGS,
  subscribeToPeople,
  type PersonRecord,
} from '@/services/people';

const filters = ['All', 'Family', 'Friends', 'School', 'Teams', 'Custom', 'Archived'] as const;
type PeopleFilter = typeof filters[number];

function matchesFilter(person: PersonRecord, filter: PeopleFilter) {
  if (filter === 'Archived') {
    return person.archivedAt !== null;
  }

  if (person.archivedAt) {
    return false;
  }

  const tagKeys = person.tags.map((tag) => tag.toLocaleLowerCase());
  if (filter === 'All') {
    return true;
  }
  if (filter === 'Family') {
    return tagKeys.includes('family');
  }
  if (filter === 'Friends') {
    return tagKeys.includes('friend');
  }
  if (filter === 'School') {
    return tagKeys.includes('school');
  }
  if (filter === 'Teams') {
    return tagKeys.includes('team');
  }

  const standardKeys = STANDARD_PERSON_TAGS.map((tag) => tag.toLocaleLowerCase());
  return tagKeys.some((tag) => !standardKeys.includes(tag));
}

export default function PeopleScreen() {
  const router = useRouter();
  const { setup } = useAuthSession();
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setup?.familyId) {
      return;
    }

    return subscribeToPeople(
      setup.familyId,
      (nextPeople) => {
        setPeople(nextPeople);
        setLoading(false);
        setError('');
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [setup?.familyId]);

  const visiblePeople = useMemo(() => {
    const searchKey = search.trim().toLocaleLowerCase();
    return people.filter((person) => {
      if (!matchesFilter(person, filter)) {
        return false;
      }
      if (!searchKey) {
        return true;
      }

      return [personDisplayName(person), person.nickname, person.notes, ...person.tags]
        .join(' ')
        .toLocaleLowerCase()
        .includes(searchKey);
    });
  }, [filter, people, search]);

  const activeCount = people.filter((person) => !person.archivedAt).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle
          title="People"
          subtitle={`${activeCount} ${activeCount === 1 ? 'person' : 'people'} in your private family directory`}
          actionIcon="ellipsis-horizontal"
          actionLabel="Add a person"
          onAction={() => router.push('/edit-person')}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={AppColors.slate} />
          <TextInput
            accessibilityLabel="Search people"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Search names, notes, or tags"
            placeholderTextColor={AppColors.slate}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable accessibilityLabel="Clear people search" onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={AppColors.slate} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
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
        </ScrollView>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={AppColors.violet} />
            <Text style={styles.stateTitle}>Opening your private directory…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={AppColors.danger} />
            <Text style={styles.stateTitle}>People are unavailable</Text>
            <Text style={styles.stateDetail}>{error}</Text>
          </View>
        ) : visiblePeople.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={30} color={AppColors.violet} />
            </View>
            <Text style={styles.stateTitle}>{people.length === 0 ? 'Add someone important' : 'No people match this view'}</Text>
            <Text style={styles.stateDetail}>
              {people.length === 0
                ? 'Start the private directory with a family member, friend, teacher, coach, or anyone who matters.'
                : 'Try another search or filter.'}
            </Text>
            {people.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/edit-person')}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Ionicons name="person-add" size={19} color={AppColors.paper} />
                <Text style={styles.addButtonText}>Add first person</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.peopleCard}>
            {visiblePeople.map((person, index) => (
              <View key={person.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${personDisplayName(person)}`}
                  onPress={() => router.push({ pathname: '/person', params: { id: person.id } })}
                  style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
                  <Avatar
                    initials={personInitials(person)}
                    imageUri={person.photoUrl}
                    color={AppColors.sky}
                    size={50}
                  />
                  <View style={styles.personCopy}>
                    <Text style={styles.personName}>{personDisplayName(person)}</Text>
                    <Text style={styles.personDetail} numberOfLines={1}>
                      {[person.nickname ? `“${person.nickname}”` : '', ...person.tags].filter(Boolean).join(' · ') || 'No tags yet'}
                    </Text>
                  </View>
                  {person.archivedAt ? <Text style={styles.archivedLabel}>Archived</Text> : null}
                  <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
                </Pressable>
                {index < visiblePeople.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.privateNote}>
          <Ionicons name="shield-checkmark" size={18} color={AppColors.mint} />
          <Text style={styles.privateNoteText}>Only verified members of your family can see this directory.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: {
    width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg, paddingBottom: 120, gap: Spacing.xl,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border,
  },
  searchInput: { flex: 1, color: AppColors.ink, fontSize: 15, fontFamily: FontFamily?.regular },
  filters: { gap: Spacing.sm, paddingRight: Spacing.xl },
  filter: {
    alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border,
  },
  filterActive: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  filterText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: AppColors.paper },
  peopleCard: {
    backgroundColor: AppColors.paper, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: AppColors.border, ...Shadow.card,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', minHeight: 82, gap: Spacing.md },
  personCopy: { flex: 1 },
  personName: { color: AppColors.ink, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  personDetail: { color: AppColors.inkMuted, fontSize: 13 },
  archivedLabel: { color: AppColors.danger, fontSize: 11, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 62 },
  stateCard: {
    alignItems: 'center', justifyContent: 'center', minHeight: 250, padding: Spacing.xxl, gap: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border,
  },
  emptyIcon: {
    alignItems: 'center', justifyContent: 'center', width: 64, height: 64,
    borderRadius: Radius.full, backgroundColor: AppColors.violetSoft,
  },
  stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  stateDetail: { color: AppColors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 390 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    minHeight: 50, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet,
  },
  addButtonText: { color: AppColors.paper, fontSize: 14, fontWeight: '700' },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  privateNoteText: { flex: 1, color: AppColors.inkMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.6 },
});
