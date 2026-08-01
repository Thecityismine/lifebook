import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { isFirebaseStorageEnabled } from '@/config/firebase';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import {
  personInitials,
  savePerson,
  saveProfileRelationship,
  STANDARD_PERSON_TAGS,
  subscribeToManagedProfiles,
  subscribeToPerson,
  subscribeToRelationships,
  uploadPersonPhoto,
  type ManagedProfileSummary,
  type PersonRecord,
} from '@/services/people';

function validBirthday(value: string) {
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

export default function EditPersonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const requestedPersonId = typeof params.id === 'string' ? params.id : '';
  const [savedPersonId, setSavedPersonId] = useState(requestedPersonId);
  const personId = savedPersonId || requestedPersonId;
  const editing = Boolean(requestedPersonId);
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [profiles, setProfiles] = useState<ManagedProfileSummary[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [relationshipLabel, setRelationshipLabel] = useState('');
  const [relationshipNotes, setRelationshipNotes] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === setup?.activeProfileId) || profiles[0] || null,
    [profiles, setup?.activeProfileId],
  );

  useEffect(() => {
    if (!familyId) {
      return;
    }
    return subscribeToManagedProfiles(familyId, setProfiles, setError);
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !requestedPersonId) {
      return;
    }

    return subscribeToPerson(
      familyId,
      requestedPersonId,
      (nextPerson) => {
        setPerson(nextPerson);
        if (nextPerson) {
          setFirstName(nextPerson.firstName);
          setLastName(nextPerson.lastName);
          setNickname(nextPerson.nickname);
          setBirthday(nextPerson.birthday);
          setNotes(nextPerson.notes);
          setTags(nextPerson.tags);
        }
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [familyId, requestedPersonId]);

  useEffect(() => {
    if (!familyId || !requestedPersonId || !activeProfile) {
      return;
    }

    return subscribeToRelationships(
      familyId,
      requestedPersonId,
      (relationships) => {
        const relationship = relationships.find((item) => item.profileId === activeProfile.id);
        setRelationshipLabel(relationship?.relationshipLabel || '');
        setRelationshipNotes(relationship?.notes || '');
      },
      setError,
    );
  }, [activeProfile, familyId, requestedPersonId]);

  const toggleTag = (tag: string) => {
    setTags((currentTags) => (
      currentTags.some((currentTag) => currentTag.toLocaleLowerCase() === tag.toLocaleLowerCase())
        ? currentTags.filter((currentTag) => currentTag.toLocaleLowerCase() !== tag.toLocaleLowerCase())
        : [...currentTags, tag].slice(0, 12)
    ));
  };

  const addCustomTag = () => {
    const cleanTag = customTag.trim();
    if (!cleanTag || cleanTag.length > 30) {
      return;
    }
    if (!tags.some((tag) => tag.toLocaleLowerCase() === cleanTag.toLocaleLowerCase())) {
      setTags((currentTags) => [...currentTags, cleanTag].slice(0, 12));
    }
    setCustomTag('');
  };

  const choosePhoto = async () => {
    if (!isFirebaseStorageEnabled) {
      setError('Private photo storage is not active yet. You can save the person now and add a photo after Storage is enabled.');
      return;
    }
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!familyId) {
      setError('Your private family space is not available right now.');
      return;
    }
    if (!firstName.trim()) {
      setError('Enter a first name.');
      return;
    }
    if (!validBirthday(birthday.trim())) {
      setError('Use a real birthday in YYYY-MM-DD format, or leave it blank.');
      return;
    }
    if (activeProfile && !relationshipLabel.trim()) {
      setError(`Describe how this person knows ${activeProfile.firstName}.`);
      return;
    }

    setSaving(true);
    setError('');
    const personResult = await savePerson(
      familyId,
      { firstName, lastName, nickname, birthday, notes, tags },
      personId || undefined,
    );

    if (!personResult.ok) {
      setError(personResult.message);
      setSaving(false);
      return;
    }

    setSavedPersonId(personResult.personId);
    if (activeProfile) {
      const relationshipResult = await saveProfileRelationship(
        familyId,
        personResult.personId,
        activeProfile.id,
        { relationshipLabel, notes: relationshipNotes },
      );
      if (!relationshipResult.ok) {
        setError(`The person was saved, but the relationship needs another try. ${relationshipResult.message}`);
        setSaving(false);
        return;
      }
    }

    if (photo) {
      const photoResult = await uploadPersonPhoto(familyId, personResult.personId, photo, person?.photoPath);
      if (!photoResult.ok) {
        setError(`The person was saved, but the photo needs another try. ${photoResult.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.replace({ pathname: '/person', params: { id: personResult.personId } });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={AppColors.violet} />
          <Text style={styles.helper}>Opening this private profile…</Text>
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
              <Text style={styles.eyebrow}>{editing ? 'Edit person' : 'Add a person'}</Text>
              <Text style={styles.title}>{editing ? 'Keep their details current' : 'Who is part of the story?'}</Text>
            </View>
          </View>

          <View style={styles.photoSection}>
            <Avatar
              initials={personInitials({ firstName: firstName || '?', lastName })}
              imageUri={photo?.uri || person?.photoUrl}
              color={AppColors.sky}
              size={92}
            />
            <View style={styles.photoCopy}>
              <Text style={styles.sectionTitle}>Profile photo</Text>
              <Text style={styles.helper}>
                {isFirebaseStorageEnabled
                  ? 'Choose a familiar photo. It stays private to verified family members.'
                  : 'Photo upload is ready and will unlock after private Firebase Storage is activated.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !isFirebaseStorageEnabled }}
                disabled={!isFirebaseStorageEnabled}
                onPress={() => void choosePhoto()}
                style={[styles.secondaryButton, !isFirebaseStorageEnabled && styles.disabledPhotoButton]}>
                <Ionicons name="image-outline" size={18} color={AppColors.violet} />
                <Text style={styles.secondaryButtonText}>
                  {isFirebaseStorageEnabled
                    ? (photo || person?.photoUrl ? 'Choose another photo' : 'Choose a photo')
                    : 'Storage setup required'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>About this person</Text>
            <FormField label="First name" placeholder="First name" maxLength={80} value={firstName} onChangeText={setFirstName} />
            <FormField label="Last name" placeholder="Last name (optional)" maxLength={80} value={lastName} onChangeText={setLastName} />
            <FormField label="Nickname" placeholder="What your family calls them" maxLength={80} value={nickname} onChangeText={setNickname} />
            <FormField
              label="Birthday"
              placeholder="YYYY-MM-DD"
              hint="The year may be approximate if your family does not know the exact date."
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              value={birthday}
              onChangeText={setBirthday}
            />
            <FormField
              label="Private notes"
              placeholder="Details your family wants to remember"
              maxLength={2000}
              multiline
              numberOfLines={5}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <Text style={styles.helper}>Tags make people easier to find without ranking relationships.</Text>
            <View style={styles.chipRow}>
              {STANDARD_PERSON_TAGS.map((tag) => {
                const selected = tags.some((currentTag) => currentTag.toLocaleLowerCase() === tag.toLocaleLowerCase());
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag}</Text>
                  </Pressable>
                );
              })}
              {tags.filter((tag) => !STANDARD_PERSON_TAGS.some((standardTag) => standardTag.toLocaleLowerCase() === tag.toLocaleLowerCase())).map((tag) => (
                <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.chip, styles.customChip]}>
                  <Text style={styles.chipText}>{tag} ×</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.customTagRow}>
              <TextInput
                accessibilityLabel="Custom tag"
                maxLength={30}
                onChangeText={setCustomTag}
                onSubmitEditing={addCustomTag}
                placeholder="Add a custom tag"
                placeholderTextColor={AppColors.slate}
                returnKeyType="done"
                style={styles.customTagInput}
                value={customTag}
              />
              <Pressable
                accessibilityLabel="Add custom tag"
                disabled={!customTag.trim() || tags.length >= 12}
                onPress={addCustomTag}
                style={[styles.addTagButton, (!customTag.trim() || tags.length >= 12) && styles.disabledButton]}>
                <Ionicons name="add" size={22} color={AppColors.paper} />
              </Pressable>
            </View>
          </View>

          {activeProfile ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Relationship to {activeProfile.firstName}</Text>
              <Text style={styles.helper}>This detail belongs to {activeProfile.firstName}’s profile, so another managed profile can describe the relationship differently.</Text>
              <FormField
                label="Relationship"
                placeholder="For example: cousin, teacher, best friend"
                maxLength={100}
                value={relationshipLabel}
                onChangeText={setRelationshipLabel}
              />
              <FormField
                label="Relationship notes"
                placeholder={`What should your family remember about ${firstName || 'this person'} and ${activeProfile.firstName}?`}
                maxLength={1000}
                multiline
                numberOfLines={4}
                value={relationshipNotes}
                onChangeText={setRelationshipNotes}
              />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={19} color={AppColors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={editing ? 'Save changes' : 'Add to LifeBook'}
            loading={saving}
            onPress={() => void handleSave()}
            icon="checkmark"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: {
    width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl,
    paddingBottom: Spacing.section, gap: Spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconButton: {
    alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border,
  },
  headerCopy: { flex: 1, paddingTop: 2 },
  eyebrow: { color: AppColors.violet, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 27, fontWeight: '700', marginTop: 3 },
  photoSection: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg,
    backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card,
  },
  photoCopy: { flex: 1, gap: Spacing.sm },
  formCard: {
    gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper,
    borderWidth: 1, borderColor: AppColors.border,
  },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  secondaryButtonText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' },
  disabledPhotoButton: { opacity: 0.55 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full, backgroundColor: AppColors.cloud, borderWidth: 1, borderColor: AppColors.border,
  },
  chipSelected: { backgroundColor: AppColors.violet, borderColor: AppColors.violet },
  customChip: { backgroundColor: AppColors.skySoft },
  chipText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: AppColors.paper },
  customTagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  customTagInput: {
    flex: 1, minHeight: 50, paddingHorizontal: Spacing.lg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: AppColors.line, backgroundColor: AppColors.cloud, color: AppColors.ink,
  },
  addTagButton: {
    alignItems: 'center', justifyContent: 'center', width: 50, height: 50,
    borderRadius: Radius.md, backgroundColor: AppColors.violet,
  },
  disabledButton: { backgroundColor: AppColors.line },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.lg,
    borderRadius: Radius.md, backgroundColor: AppColors.blushSoft,
  },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
