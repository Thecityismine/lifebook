import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  saveMemory,
  subscribeToMemory,
  uploadMemoryPhoto,
  type MemoryRecord,
} from '@/services/memories';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';

function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function validDate(value: string) {
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

export default function EditMemoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; personId?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';
  const requestedMemoryId = typeof params.id === 'string' ? params.id : '';
  const initialPersonId = typeof params.personId === 'string' ? params.personId : '';
  const [memory, setMemory] = useState<MemoryRecord | null>(null);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayInputValue);
  const [personIds, setPersonIds] = useState<string[]>(initialPersonId ? [initialPersonId] : []);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(Boolean(requestedMemoryId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const visiblePeople = useMemo(
    () => people.filter((person) => !person.archivedAt || personIds.includes(person.id)),
    [people, personIds],
  );

  useEffect(() => {
    if (!familyId) {
      return;
    }
    return subscribeToPeople(familyId, setPeople, setError);
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !requestedMemoryId) {
      return;
    }
    return subscribeToMemory(
      familyId,
      requestedMemoryId,
      (nextMemory) => {
        setMemory(nextMemory);
        if (nextMemory) {
          setTitle(nextMemory.title);
          setStory(nextMemory.story);
          setOccurredOn(nextMemory.occurredOn);
          setPersonIds(nextMemory.personIds);
        }
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [familyId, requestedMemoryId]);

  const togglePerson = (personId: string) => {
    setPersonIds((current) => current.includes(personId)
      ? current.filter((id) => id !== personId)
      : [...current, personId].slice(0, 20));
  };

  const choosePhoto = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) {
      return;
    }
    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize >= 8 * 1024 * 1024) {
      setError('Choose an image smaller than 8 MB.');
      return;
    }
    setPhoto(selected);
  };

  const handleSave = async () => {
    if (!familyId || !profileId) {
      setError('Your active private LifeBook profile is not available right now.');
      return;
    }
    if (!title.trim()) {
      setError('Give this memory a title.');
      return;
    }
    if (!validDate(occurredOn.trim())) {
      setError('Use a real date in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await saveMemory(
      familyId,
      profileId,
      { title, story, occurredOn, personIds },
      requestedMemoryId || undefined,
    );
    if (!result.ok) {
      setError(result.message);
      setSaving(false);
      return;
    }

    if (photo) {
      const photoResult = await uploadMemoryPhoto(familyId, result.memoryId, photo, memory?.photoPath);
      if (!photoResult.ok) {
        setError(`The memory was saved, but the photo needs another try. ${photoResult.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.replace({ pathname: '/memory', params: { id: result.memoryId } });
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{requestedMemoryId ? 'Edit memory' : 'New memory'}</Text>
              <Text style={styles.title}>{requestedMemoryId ? 'Keep the story true' : 'Save a moment worth keeping'}</Text>
            </View>
          </View>

          <View style={styles.photoCard}>
            {photo?.uri || memory?.photoUrl ? (
              <Image source={{ uri: photo?.uri || memory?.photoUrl || '' }} resizeMode="cover" style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="images-outline" size={36} color={AppColors.blush} />
                <Text style={styles.photoPlaceholderText}>A photo can bring this moment back</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !isFirebaseStorageEnabled }}
              disabled={!isFirebaseStorageEnabled}
              onPress={() => void choosePhoto()}
              style={[styles.photoButton, !isFirebaseStorageEnabled && styles.disabled]}>
              <Ionicons name="image-outline" size={18} color={AppColors.violet} />
              <Text style={styles.photoButtonText}>
                {isFirebaseStorageEnabled
                  ? (photo || memory?.photoUrl ? 'Choose another photo' : 'Choose a photo')
                  : 'Private photo storage unavailable'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>The moment</Text>
            <FormField label="Title" placeholder="The science fair" maxLength={120} value={title} onChangeText={setTitle} />
            <FormField
              label="Date"
              placeholder="YYYY-MM-DD"
              hint="Use the date the memory happened."
              maxLength={10}
              value={occurredOn}
              onChangeText={setOccurredOn}
            />
            <FormField
              label="Story (optional)"
              placeholder="What happened? What made this worth remembering?"
              maxLength={5000}
              multiline
              numberOfLines={6}
              value={story}
              onChangeText={setStory}
            />
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>People in this memory</Text>
                <Text style={styles.helper}>Choose anyone who was part of the moment.</Text>
              </View>
              <Text style={styles.selectionCount}>{personIds.length}/20</Text>
            </View>
            {visiblePeople.length === 0 ? (
              <View style={styles.emptyPeople}>
                <Text style={styles.helper}>Add people to your family directory, then return to connect them.</Text>
                <Pressable onPress={() => router.push('/edit-person')} style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>Add a person</Text>
                </Pressable>
              </View>
            ) : visiblePeople.map((person, index) => {
              const selected = personIds.includes(person.id);
              return (
                <View key={person.id}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => togglePerson(person.id)}
                    style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
                    <Avatar initials={personInitials(person)} imageUri={person.photoUrl} color={AppColors.sky} size={42} />
                    <Text style={styles.personName}>{personDisplayName(person)}</Text>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={25}
                      color={selected ? AppColors.violet : AppColors.slate}
                    />
                  </Pressable>
                  {index < visiblePeople.length - 1 ? <View style={styles.divider} /> : null}
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
            label={requestedMemoryId ? 'Save changes' : 'Save memory'}
            icon="heart"
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
  photoCard: { padding: Spacing.md, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  photoPlaceholder: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  photoPlaceholderText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '600' },
  photoButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, backgroundColor: AppColors.violetSoft },
  photoButtonText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  formCard: { padding: Spacing.xl, gap: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  sectionCopy: { flex: 1, gap: 3 },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  selectionCount: { color: AppColors.violet, fontSize: 12, fontWeight: '800', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.violetSoft },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52 },
  personName: { flex: 1, color: AppColors.ink, fontSize: 14, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 54 },
  emptyPeople: { alignItems: 'flex-start', gap: Spacing.md },
  inlineButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.violetSoft },
  inlineButtonText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  privateNoteText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  pressed: { opacity: 0.6 },
});
