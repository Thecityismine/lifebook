import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { REMINDER_KIND_OPTIONS, reminderKind } from '@/constants/reminders';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { personDisplayName, personInitials, subscribeToPeople, type PersonRecord } from '@/services/people';
import {
  saveReminder,
  subscribeToReminder,
  validReminderDate,
  validReminderTime,
  type ReminderKind,
} from '@/services/reminders';

function todayValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function EditReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; personId?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const profileId = setup?.activeProfileId || '';
  const reminderId = typeof params.id === 'string' ? params.id : '';
  const initialPersonId = typeof params.personId === 'string' ? params.personId : '';
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueOn, setDueOn] = useState(todayValue());
  const [timeOfDay, setTimeOfDay] = useState('');
  const [kind, setKind] = useState<ReminderKind>('other');
  const [personId, setPersonId] = useState(initialPersonId);
  const [loading, setLoading] = useState(Boolean(reminderId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const visiblePeople = useMemo(() => people.filter((person) => !person.archivedAt || person.id === personId), [people, personId]);
  const visual = reminderKind(kind);

  useEffect(() => {
    if (!familyId) return;
    return subscribeToPeople(familyId, setPeople, setError);
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !reminderId) return;
    return subscribeToReminder(familyId, reminderId, (nextReminder) => {
      if (nextReminder) {
        setTitle(nextReminder.title);
        setNotes(nextReminder.notes);
        setDueOn(nextReminder.dueOn);
        setTimeOfDay(nextReminder.timeOfDay);
        setKind(nextReminder.kind);
        setPersonId(nextReminder.personId);
      }
      setLoading(false);
    }, (message) => {
      setError(message);
      setLoading(false);
    });
  }, [familyId, reminderId]);

  const handleSave = async () => {
    if (!familyId || !profileId) {
      setError('Your active private LifeBook profile is not available right now.');
      return;
    }
    if (!title.trim()) {
      setError('Give this reminder a title.');
      return;
    }
    if (!validReminderDate(dueOn.trim())) {
      setError('Use a real date in YYYY-MM-DD format.');
      return;
    }
    if (!validReminderTime(timeOfDay.trim())) {
      setError('Use 24-hour time in HH:mm format, or leave the time blank.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await saveReminder(
      familyId,
      profileId,
      { title, notes, dueOn, timeOfDay, kind, personId },
      reminderId || undefined,
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace({ pathname: '/reminder', params: { id: result.reminderId } });
  };

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.centerState}><ActivityIndicator color={AppColors.violet} /><Text style={styles.helper}>Opening this private reminder…</Text></View></SafeAreaView>;
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
              <Text style={styles.eyebrow}>{reminderId ? 'Edit reminder' : 'New reminder'}</Text>
              <Text style={styles.title}>{reminderId ? 'Keep the details current' : 'Keep an important moment close'}</Text>
            </View>
          </View>

          <View style={[styles.preview, { backgroundColor: visual.softColor }]}>
            <View style={[styles.previewIcon, { backgroundColor: AppColors.paper }]}><Ionicons name={visual.icon} size={36} color={visual.color} /></View>
            <View style={styles.previewCopy}><Text style={styles.previewLabel}>{title.trim() || 'New reminder'}</Text><Text style={[styles.previewKind, { color: visual.color }]}>{visual.label}</Text></View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reminder details</Text>
            <FormField label="Title" placeholder="Dentist appointment" maxLength={120} value={title} onChangeText={setTitle} />
            <FormField label="Date" placeholder="YYYY-MM-DD" hint="Use the local calendar date for this event." maxLength={10} value={dueOn} onChangeText={setDueOn} />
            <FormField label="Time (optional)" placeholder="HH:mm" hint="Use 24-hour time, such as 15:30." maxLength={5} value={timeOfDay} onChangeText={setTimeOfDay} />
            <FormField label="Notes (optional)" placeholder="What should your family remember?" maxLength={2000} multiline numberOfLines={4} value={notes} onChangeText={setNotes} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Type</Text>
            <View style={styles.optionGrid}>
              {REMINDER_KIND_OPTIONS.map((option) => {
                const selected = option.key === kind;
                return <Pressable key={option.key} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setKind(option.key)} style={[styles.kindOption, selected && { backgroundColor: option.color, borderColor: option.color }]}><Ionicons name={option.icon} size={21} color={selected ? AppColors.paper : option.color} /><Text style={[styles.kindText, selected && styles.selectedText]}>{option.label}</Text></Pressable>;
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Link a person</Text>
            <Text style={styles.helperLeft}>Optional. This makes the reminder easier to recognize across the family story.</Text>
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: !personId }} onPress={() => setPersonId('')} style={[styles.personOption, !personId && styles.personSelected]}>
              <View style={styles.noneAvatar}><Ionicons name="remove" size={18} color={AppColors.slate} /></View><Text style={styles.personName}>No linked person</Text>{!personId ? <Ionicons name="checkmark-circle" size={23} color={AppColors.violet} /> : null}
            </Pressable>
            {visiblePeople.map((person) => {
              const selected = person.id === personId;
              return <Pressable key={person.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPersonId(person.id)} style={[styles.personOption, selected && styles.personSelected]}><Avatar initials={personInitials(person)} imageUri={person.photoUrl} size={38} color={AppColors.sky} /><Text style={styles.personName}>{personDisplayName(person)}</Text>{selected ? <Ionicons name="checkmark-circle" size={23} color={AppColors.violet} /> : null}</Pressable>;
            })}
          </View>

          {error ? <View style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
          <PrimaryButton label={reminderId ? 'Save changes' : 'Save reminder'} icon="notifications" loading={saving} onPress={() => void handleSave()} />
          <View style={styles.privateNote}><Ionicons name="lock-closed" size={15} color={AppColors.mint} /><Text style={styles.privateText}>Private to verified members of your family</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }, headerCopy: { flex: 1, gap: 3 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, minHeight: 118, padding: Spacing.xl, borderRadius: Radius.xl, ...Shadow.card },
  previewIcon: { width: 66, height: 66, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' }, previewCopy: { flex: 1 },
  previewLabel: { color: AppColors.ink, fontSize: 20, fontWeight: '700' }, previewKind: { marginTop: 4, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  card: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700' }, helper: { color: AppColors.inkMuted, fontSize: 13 }, helperLeft: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }, kindOption: { width: '48%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.cloud },
  kindText: { color: AppColors.ink, fontSize: 13, fontWeight: '700' }, selectedText: { color: AppColors.paper },
  personOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: AppColors.border }, personSelected: { borderColor: AppColors.violet, backgroundColor: AppColors.violetSoft },
  noneAvatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.cloud }, personName: { flex: 1, color: AppColors.ink, fontSize: 14, fontWeight: '700' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  privateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, privateText: { color: AppColors.inkMuted, fontSize: 12, fontWeight: '600' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
