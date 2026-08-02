import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  personDisplayName,
  saveProfileRelationship,
  subscribeToManagedProfiles,
  subscribeToPerson,
  subscribeToRelationships,
  type ManagedProfileSummary,
  type PersonRecord,
  type ProfileRelationship,
} from '@/services/people';

export default function ManageRelationshipScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string; profileId?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const personId = typeof params.personId === 'string' ? params.personId : '';
  const requestedProfileId = typeof params.profileId === 'string' ? params.profileId : '';
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [profiles, setProfiles] = useState<ManagedProfileSummary[]>([]);
  const [relationships, setRelationships] = useState<ProfileRelationship[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(requestedProfileId || setup?.activeProfileId || '');
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(Boolean(personId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId || !personId) {
      return;
    }
    const unsubscribePerson = subscribeToPerson(familyId, personId, (nextPerson) => {
      setPerson(nextPerson);
      setLoading(false);
    }, setError);
    const unsubscribeProfiles = subscribeToManagedProfiles(familyId, (nextProfiles) => {
      setProfiles(nextProfiles);
      setSelectedProfileId((currentId) => currentId || nextProfiles[0]?.id || '');
    }, setError);
    const unsubscribeRelationships = subscribeToRelationships(familyId, personId, (nextRelationships) => {
      setRelationships(nextRelationships);
      setSelectedProfileId((currentProfileId) => {
        const nextProfileId = currentProfileId || requestedProfileId || setup?.activeProfileId || '';
        const relationship = nextRelationships.find((item) => item.profileId === nextProfileId);
        setRelationshipLabel(relationship?.relationshipLabel || '');
        setNotes(relationship?.notes || '');
        return nextProfileId;
      });
    }, setError);
    return () => {
      unsubscribePerson();
      unsubscribeProfiles();
      unsubscribeRelationships();
    };
  }, [familyId, personId, requestedProfileId, setup?.activeProfileId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId],
  );

  const selectProfile = (profileId: string) => {
    const relationship = relationships.find((item) => item.profileId === profileId);
    setSelectedProfileId(profileId);
    setRelationshipLabel(relationship?.relationshipLabel || '');
    setNotes(relationship?.notes || '');
  };

  const handleSave = async () => {
    if (!familyId || !personId || !selectedProfileId) {
      setError('Choose a managed profile before saving this relationship.');
      return;
    }
    if (!relationshipLabel.trim()) {
      setError('Add a relationship, such as cousin, teacher, coach, or friend.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await saveProfileRelationship(familyId, personId, selectedProfileId, { relationshipLabel, notes });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={AppColors.violet} />
          <Text style={styles.helper}>Opening relationship details…</Text>
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
              <Text style={styles.eyebrow}>Private relationship</Text>
              <Text style={styles.title}>{person ? personDisplayName(person) : 'Person'}</Text>
              <Text style={styles.helper}>Describe this relationship without changing how another profile knows them.</Text>
            </View>
          </View>

          {profiles.length > 1 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Managed profile</Text>
              <View style={styles.profileOptions}>
                {profiles.map((profile) => {
                  const selected = profile.id === selectedProfileId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={profile.id}
                      onPress={() => selectProfile(profile.id)}
                      style={[styles.profileChip, selected && styles.profileChipSelected]}>
                      <Text style={[styles.profileChipText, selected && styles.profileChipTextSelected]}>{profile.firstName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Relationship to {selectedProfile?.firstName || 'this profile'}</Text>
            <FormField
              label="Relationship"
              placeholder="For example: cousin, teacher, best friend"
              maxLength={100}
              value={relationshipLabel}
              onChangeText={setRelationshipLabel}
            />
            <FormField
              label="Relationship notes"
              placeholder="Shared context your family wants to remember"
              maxLength={1000}
              multiline
              numberOfLines={5}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={19} color={AppColors.mint} />
            <Text style={styles.privacyText}>Only verified members of this family space can read these details.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={19} color={AppColors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton label="Save relationship" icon="checkmark" loading={saving} onPress={() => void handleSave()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconButton: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: AppColors.violet, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 28, fontWeight: '700' },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  card: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  profileOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  profileChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg, borderRadius: Radius.full, backgroundColor: AppColors.cloud, borderWidth: 1, borderColor: AppColors.border },
  profileChipSelected: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  profileChipText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '700' },
  profileChipTextSelected: { color: AppColors.onAccent },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.mintSoft },
  privacyText: { flex: 1, color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
});
