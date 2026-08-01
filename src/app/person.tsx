import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  personDisplayName,
  personInitials,
  setPersonArchived,
  subscribeToManagedProfiles,
  subscribeToPerson,
  subscribeToRelationships,
  type ManagedProfileSummary,
  type PersonRecord,
  type ProfileRelationship,
} from '@/services/people';

function formatBirthday(birthday: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) {
    return birthday;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export default function PersonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const personId = typeof params.id === 'string' ? params.id : '';
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [profiles, setProfiles] = useState<ManagedProfileSummary[]>([]);
  const [relationships, setRelationships] = useState<ProfileRelationship[]>([]);
  const [loading, setLoading] = useState(Boolean(personId));
  const [updatingArchive, setUpdatingArchive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId || !personId) {
      return;
    }
    return subscribeToPerson(
      familyId,
      personId,
      (nextPerson) => {
        setPerson(nextPerson);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [familyId, personId]);

  useEffect(() => {
    if (!familyId || !personId) {
      return;
    }
    const unsubscribeProfiles = subscribeToManagedProfiles(familyId, setProfiles, setError);
    const unsubscribeRelationships = subscribeToRelationships(familyId, personId, setRelationships, setError);
    return () => {
      unsubscribeProfiles();
      unsubscribeRelationships();
    };
  }, [familyId, personId]);

  const relationshipRows = useMemo(() => profiles.map((profile) => ({
    profile,
    relationship: relationships.find((relationship) => relationship.profileId === profile.id) || null,
  })), [profiles, relationships]);

  const updateArchive = async (archived: boolean) => {
    if (!familyId || !personId) {
      return;
    }
    setUpdatingArchive(true);
    setError('');
    const result = await setPersonArchived(familyId, personId, archived);
    setUpdatingArchive(false);
    if (!result.ok) {
      setError(result.message);
    }
  };

  const confirmArchive = () => {
    if (person?.archivedAt) {
      void updateArchive(false);
      return;
    }
    Alert.alert(
      'Archive this person?',
      'Their details and future memories stay safe. You can restore them from the Archived filter.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => void updateArchive(true) },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={AppColors.violet} />
          <Text style={styles.helper}>Opening this private profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!person) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="person-outline" size={34} color={AppColors.slate} />
          <Text style={styles.sectionTitle}>This person could not be found</Text>
          <Text style={styles.helper}>{error || 'Return to the directory and choose someone else.'}</Text>
          <Pressable onPress={() => router.replace('/people')} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Back to People</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = personDisplayName(person);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Back to People" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel={`Edit ${displayName}`}
            onPress={() => router.push({ pathname: '/edit-person', params: { id: person.id } })}
            style={styles.iconButton}>
            <Ionicons name="create-outline" size={23} color={AppColors.violet} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={AppColors.sky} size={108} />
          <Text style={styles.name}>{displayName}</Text>
          {person.nickname ? <Text style={styles.nickname}>“{person.nickname}”</Text> : null}
          {person.archivedAt ? (
            <View style={styles.archivedBadge}>
              <Ionicons name="archive-outline" size={15} color={AppColors.danger} />
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          ) : null}
          {person.tags.length > 0 ? (
            <View style={styles.tags}>
              {person.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: AppColors.sunSoft }]}>
              <Ionicons name="gift-outline" size={20} color={AppColors.sun} />
            </View>
            <View style={styles.detailCopy}>
              <Text style={styles.detailLabel}>Birthday</Text>
              <Text style={styles.detailValue}>{person.birthday ? formatBirthday(person.birthday) : 'Not added yet'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.notesBlock}>
            <Text style={styles.detailLabel}>Private family notes</Text>
            <Text style={person.notes ? styles.notes : styles.emptyValue}>{person.notes || 'No notes yet.'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>Relationships</Text>
            <Text style={styles.helper}>Each managed profile keeps its own relationship details.</Text>
          </View>
        </View>

        <View style={styles.card}>
          {relationshipRows.length === 0 ? (
            <Text style={styles.emptyValue}>No managed profiles are available.</Text>
          ) : relationshipRows.map(({ profile, relationship }, index) => (
            <View key={profile.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${relationship ? 'Edit' : 'Add'} relationship for ${profile.firstName}`}
                onPress={() => router.push({
                  pathname: '/manage-relationship',
                  params: { personId: person.id, profileId: profile.id },
                })}
                style={({ pressed }) => [styles.relationshipRow, pressed && styles.pressed]}>
                <View style={[styles.detailIcon, { backgroundColor: AppColors.mintSoft }]}>
                  <Ionicons name="git-network-outline" size={20} color={AppColors.mint} />
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>{profile.firstName}</Text>
                  <Text style={relationship ? styles.detailValue : styles.emptyValue}>
                    {relationship?.relationshipLabel || 'Add relationship'}
                  </Text>
                  {relationship?.notes ? <Text style={styles.relationshipNotes} numberOfLines={2}>{relationship.notes}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={19} color={AppColors.slate} />
              </Pressable>
              {index < relationshipRows.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={[styles.card, styles.timelineCard]}>
          <View style={[styles.detailIcon, { backgroundColor: AppColors.blushSoft }]}>
            <Ionicons name="heart-outline" size={21} color={AppColors.blush} />
          </View>
          <View style={styles.detailCopy}>
            <Text style={styles.sectionTitle}>Shared memories</Text>
            <Text style={styles.helper}>Memories involving {person.firstName} will form a private timeline here in Phase 3.</Text>
          </View>
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
          {updatingArchive ? <ActivityIndicator color={person.archivedAt ? AppColors.violet : AppColors.danger} /> : (
            <>
              <Ionicons name={person.archivedAt ? 'refresh' : 'archive-outline'} size={19} color={person.archivedAt ? AppColors.violet : AppColors.danger} />
              <Text style={[styles.archiveText, person.archivedAt && styles.restoreText]}>
                {person.archivedAt ? 'Restore to People' : 'Archive person'}
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
  content: {
    width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl,
    paddingBottom: Spacing.section, gap: Spacing.xl,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: {
    alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border,
  },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  name: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '700', textAlign: 'center' },
  nickname: { color: AppColors.inkMuted, fontSize: 15 },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft },
  archivedBadgeText: { color: AppColors.danger, fontSize: 12, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  tag: { color: AppColors.violet, fontSize: 12, fontWeight: '700', paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  card: { padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionHeadingCopy: { flex: 1, gap: 4 },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.lg },
  detailIcon: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: Radius.md },
  detailCopy: { flex: 1 },
  detailLabel: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  detailValue: { color: AppColors.ink, fontSize: 15, fontWeight: '700' },
  emptyValue: { color: AppColors.slate, fontSize: 14, fontStyle: 'italic' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginVertical: Spacing.lg },
  notesBlock: { gap: Spacing.sm },
  notes: { color: AppColors.ink, fontSize: 14, lineHeight: 21 },
  relationshipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 62 },
  relationshipNotes: { color: AppColors.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  timelineCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 52, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.paper },
  archiveText: { color: AppColors.danger, fontSize: 14, fontWeight: '700' },
  restoreText: { color: AppColors.violet },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  primaryAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet },
  primaryActionText: { color: AppColors.paper, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
