import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { reminderKind } from '@/constants/reminders';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { personDisplayName, personInitials, subscribeToPerson, type PersonRecord } from '@/services/people';
import { reminderDateLabel, setReminderArchived, setReminderCompleted, subscribeToReminder, type ReminderRecord } from '@/services/reminders';

export default function ReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const reminderId = typeof params.id === 'string' ? params.id : '';
  const [reminder, setReminder] = useState<ReminderRecord | null>(null);
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(reminderId));
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId || !reminderId) return;
    return subscribeToReminder(familyId, reminderId, (value) => { setReminder(value); setLoading(false); }, (message) => { setError(message); setLoading(false); });
  }, [familyId, reminderId]);
  useEffect(() => {
    if (!familyId || !reminder?.personId) return;
    return subscribeToPerson(familyId, reminder.personId, setPerson, setError);
  }, [familyId, reminder?.personId]);

  const linkedPerson = person?.id === reminder?.personId ? person : null;

  const changeCompleted = async () => {
    if (!reminder) return;
    setUpdating(true); setError('');
    const result = await setReminderCompleted(familyId, reminder.id, !reminder.completedAt);
    setUpdating(false); if (!result.ok) setError(result.message);
  };
  const changeArchived = async (archived: boolean) => {
    if (!reminder) return;
    setUpdating(true); setError('');
    const result = await setReminderArchived(familyId, reminder.id, archived);
    setUpdating(false); if (!result.ok) setError(result.message);
  };
  const confirmArchive = () => {
    if (!reminder) return;
    if (reminder.archivedAt) { void changeArchived(false); return; }
    Alert.alert('Archive this reminder?', 'It will leave Coming up but can be restored from the Archived filter.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: () => void changeArchived(true) }]);
  };

  if (loading) return <SafeAreaView style={styles.safeArea}><View style={styles.centerState}><ActivityIndicator color={AppColors.violet} /><Text style={styles.helper}>Opening this private reminder…</Text></View></SafeAreaView>;
  if (!reminder) return <SafeAreaView style={styles.safeArea}><View style={styles.centerState}><Ionicons name="notifications-off-outline" size={38} color={AppColors.slate} /><Text style={styles.sectionTitle}>This reminder could not be found</Text><Text style={styles.helper}>{error || 'Return to Reminders and choose another moment.'}</Text><Pressable onPress={() => router.replace('/reminders')} style={styles.primaryAction}><Text style={styles.primaryActionText}>Back to Reminders</Text></Pressable></View></SafeAreaView>;

  const visual = reminderKind(reminder.kind);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}><Pressable accessibilityLabel="Back to Reminders" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={AppColors.ink} /></Pressable><Pressable accessibilityLabel={`Edit ${reminder.title}`} onPress={() => router.push({ pathname: '/edit-reminder', params: { id: reminder.id } })} style={styles.iconButton}><Ionicons name="create-outline" size={23} color={AppColors.violet} /></Pressable></View>
      <View style={[styles.hero, { backgroundColor: visual.softColor }]}><View style={[styles.heroOrb, { backgroundColor: visual.color }]} /><Ionicons name={reminder.completedAt ? 'checkmark-circle' : visual.icon} size={70} color={reminder.completedAt ? AppColors.mint : visual.color} /></View>
      <View style={styles.titleBlock}><Text style={[styles.eyebrow, { color: visual.color }]}>{visual.label.toUpperCase()}</Text><Text style={[styles.title, reminder.completedAt && styles.completed]}>{reminder.title}</Text><Text style={styles.date}>{reminderDateLabel(reminder.dueOn, reminder.timeOfDay)}</Text><View style={styles.badges}>{reminder.completedAt ? <View style={styles.completeBadge}><Ionicons name="checkmark" size={14} color={AppColors.mint} /><Text style={styles.completeText}>Completed</Text></View> : null}{reminder.archivedAt ? <View style={styles.archiveBadge}><Ionicons name="archive-outline" size={14} color={AppColors.danger} /><Text style={styles.archiveBadgeText}>Archived</Text></View> : null}</View></View>
      <Pressable disabled={updating || Boolean(reminder.archivedAt)} onPress={() => void changeCompleted()} style={[styles.completeButton, reminder.completedAt && styles.reopenButton, reminder.archivedAt && styles.disabled]}>{updating ? <ActivityIndicator color={AppColors.paper} /> : <><Ionicons name={reminder.completedAt ? 'refresh' : 'checkmark-circle'} size={21} color={AppColors.paper} /><Text style={styles.completeButtonText}>{reminder.completedAt ? 'Mark as upcoming' : 'Mark complete'}</Text></>}</Pressable>
      <View style={styles.card}><Text style={styles.sectionTitle}>Notes</Text><Text style={reminder.notes ? styles.notes : styles.emptyValue}>{reminder.notes || 'No notes were added. Edit this reminder whenever more details are helpful.'}</Text></View>
      {linkedPerson ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${personDisplayName(linkedPerson)}`} onPress={() => router.push({ pathname: '/person', params: { id: linkedPerson.id } })} style={({ pressed }) => [styles.personCard, pressed && styles.pressed]}><Avatar initials={personInitials(linkedPerson)} imageUri={linkedPerson.photoUrl} size={52} color={AppColors.sky} /><View style={styles.personCopy}><Text style={styles.personEyebrow}>LINKED PERSON</Text><Text style={styles.personName}>{personDisplayName(linkedPerson)}</Text></View><Ionicons name="chevron-forward" size={20} color={AppColors.slate} /></Pressable> : null}
      {error ? <View style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
      <Pressable accessibilityRole="button" disabled={updating} onPress={confirmArchive} style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>{updating ? <ActivityIndicator color={AppColors.danger} /> : <><Ionicons name={reminder.archivedAt ? 'refresh' : 'archive-outline'} size={19} color={reminder.archivedAt ? AppColors.violet : AppColors.danger} /><Text style={[styles.archiveText, reminder.archivedAt && styles.restoreText]}>{reminder.archivedAt ? 'Restore reminder' : 'Archive reminder'}</Text></>}</Pressable>
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl }, topBar: { flexDirection: 'row', justifyContent: 'space-between' }, iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  hero: { minHeight: 250, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Radius.xl, ...Shadow.card }, heroOrb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, opacity: 0.12 }, titleBlock: { gap: Spacing.sm }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 32, lineHeight: 39, fontWeight: '700' }, completed: { color: AppColors.slate, textDecorationLine: 'line-through' }, date: { color: AppColors.inkMuted, fontSize: 15, fontWeight: '600' }, badges: { flexDirection: 'row', gap: Spacing.sm }, completeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.mintSoft }, completeText: { color: AppColors.mint, fontSize: 12, fontWeight: '800' }, archiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: AppColors.blushSoft }, archiveBadgeText: { color: AppColors.danger, fontSize: 12, fontWeight: '800' },
  completeButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: AppColors.mint }, reopenButton: { backgroundColor: AppColors.violet }, completeButtonText: { color: AppColors.paper, fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.42 }, card: { padding: Spacing.xl, gap: Spacing.md, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card }, sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '700', textAlign: 'left' }, notes: { color: AppColors.ink, fontSize: 15, lineHeight: 24 }, emptyValue: { color: AppColors.slate, fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  personCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card }, personCopy: { flex: 1 }, personEyebrow: { color: AppColors.violet, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, personName: { color: AppColors.ink, fontSize: 16, fontWeight: '700', marginTop: 3 }, errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13 }, archiveButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.paper }, archiveText: { color: AppColors.danger, fontSize: 14, fontWeight: '700' }, restoreText: { color: AppColors.violet },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }, helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' }, primaryAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violet }, primaryActionText: { color: AppColors.paper, fontWeight: '700' }, pressed: { opacity: 0.65 },
});
