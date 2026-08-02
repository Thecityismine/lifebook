import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { reauthenticateParent } from '@/services/auth';
import {
  createFamilyExport,
  saveFamilyExport,
  savePrivacySettings,
  subscribeToConsentHistory,
  subscribeToFamilyRole,
  subscribeToPrivacySettings,
  type ConsentRecord,
  type FamilyRole,
  type PrivacySettings,
} from '@/services/privacy';

function consentDate(record: ConsentRecord) {
  return record.acceptedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(record.acceptedAt.toDate())
    : 'Date pending sync';
}

export default function PrivacyScreen() {
  const router = useRouter();
  const { user, setup } = useAuthSession();
  const familyId = setup?.familyId || '';
  const [settings, setSettings] = useState<PrivacySettings>({ defaultVisibility: 'family', guardianCanEdit: true });
  const [role, setRole] = useState<FamilyRole>('member');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!familyId || !user?.uid) return;
    const unsubscribeSettings = subscribeToPrivacySettings(familyId, (value) => { setSettings(value); setLoading(false); }, (message) => { setError(message); setLoading(false); });
    const unsubscribeRole = subscribeToFamilyRole(familyId, user.uid, setRole, setError);
    const unsubscribeConsents = subscribeToConsentHistory(user.uid, setConsents, setError);
    return () => { unsubscribeSettings(); unsubscribeRole(); unsubscribeConsents(); };
  }, [familyId, user?.uid]);

  const updateGuardianEditing = async (guardianCanEdit: boolean) => {
    setSaving(true); setError(''); setNotice('');
    const result = await savePrivacySettings(familyId, { defaultVisibility: 'family', guardianCanEdit });
    setSaving(false);
    if (!result.ok) { setError(result.message); return; }
    setNotice(guardianCanEdit ? 'Guardian editing is enabled.' : 'Guardian editing is disabled.');
  };

  const exportData = async () => {
    if (!password) { setError('Enter your password to create a private export.'); return; }
    setExporting(true); setError(''); setNotice('');
    const authResult = await reauthenticateParent(password);
    if (!authResult.ok) { setExporting(false); setError(authResult.message); return; }
    const exportResult = await createFamilyExport(familyId);
    if (!exportResult.ok || !exportResult.json) { setExporting(false); setError(exportResult.ok ? 'LifeBook could not prepare the export.' : exportResult.message); return; }
    const saveResult = await saveFamilyExport(exportResult.json);
    setExporting(false); setPassword('');
    if (!saveResult.ok) { setError(saveResult.message); return; }
    setNotice(`${saveResult.fileName || 'Your LifeBook export'} is ready.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={AppColors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>Your family, your control</Text><Text style={styles.title}>Privacy & data</Text><Text style={styles.subtitle}>See who can contribute, review consent, export your records, or delete the account.</Text></View></View>

        <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={34} color={AppColors.mint} /></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>Family-only by default</Text><Text style={styles.heroText}>LifeBook has no public profiles, followers, advertising, or cross-family discovery. Verified family membership is required for every protected record.</Text></View></View>

        <View style={styles.card}>
          <View style={styles.cardHeading}><View style={styles.cardIcon}><Ionicons name="people-outline" size={22} color={AppColors.violet} /></View><View style={styles.cardCopy}><Text style={styles.sectionTitle}>Guardian editing</Text><Text style={styles.helper}>Owners decide whether guardians can create or change family content. Guardians can still read the family archive.</Text></View></View>
          {loading ? <ActivityIndicator color={AppColors.violet} /> : <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={styles.settingTitle}>Allow guardian edits</Text><Text style={styles.settingDetail}>{role === 'owner' ? 'Changes are recorded in the family audit trail.' : 'Only the family owner can change this setting.'}</Text></View><Switch accessibilityLabel="Allow guardian edits" disabled={role !== 'owner' || saving} value={settings.guardianCanEdit} onValueChange={(value) => void updateGuardianEditing(value)} trackColor={{ false: AppColors.line, true: AppColors.mintSoft }} thumbColor={settings.guardianCanEdit ? AppColors.mint : AppColors.slate} /></View>}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/family-access')} style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}><View style={[styles.linkIcon, { backgroundColor: AppColors.mintSoft }]}><Ionicons name="people" size={23} color={AppColors.mint} /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>Family access & invitations</Text><Text style={styles.linkDetail}>Review members, create expiring invitations, choose roles, or transfer ownership.</Text></View><Ionicons name="chevron-forward" size={20} color={AppColors.slate} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/notification-settings')} style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}><View style={[styles.linkIcon, { backgroundColor: AppColors.sunSoft }]}><Ionicons name="notifications-outline" size={23} color={AppColors.sun} /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>Reminder notifications</Text><Text style={styles.linkDetail}>Choose privacy-safe, opt-in alerts for this phone or tablet.</Text></View><Ionicons name="chevron-forward" size={20} color={AppColors.slate} /></Pressable>

        <View style={styles.card}>
          <View style={styles.cardHeading}><View style={[styles.cardIcon, { backgroundColor: AppColors.skySoft }]}><Ionicons name="document-text-outline" size={22} color={AppColors.sky} /></View><View style={styles.cardCopy}><Text style={styles.sectionTitle}>Consent history</Text><Text style={styles.helper}>These records are immutable and show which parent-led privacy notice was accepted.</Text></View></View>
          {consents.length === 0 ? <Text style={styles.emptyText}>No consent record is available yet.</Text> : consents.map((record, index) => <View key={record.id}><View style={styles.consentRow}><Ionicons name={record.guardianConfirmed ? 'checkmark-circle' : 'alert-circle'} size={22} color={record.guardianConfirmed ? AppColors.mint : AppColors.danger} /><View style={styles.consentCopy}><Text style={styles.consentVersion}>{record.version}</Text><Text style={styles.consentDate}>{consentDate(record)} · {record.source || 'Recorded in LifeBook'}</Text></View></View>{index < consents.length - 1 ? <View style={styles.divider} /> : null}</View>)}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}><View style={[styles.cardIcon, { backgroundColor: AppColors.sunSoft }]}><Ionicons name="download-outline" size={22} color={AppColors.sun} /></View><View style={styles.cardCopy}><Text style={styles.sectionTitle}>Export family data</Text><Text style={styles.helper}>Download machine-readable JSON containing family records, consent history, audit events, and links to stored media.</Text></View></View>
          <FormField label="Confirm your password" placeholder="Your account password" secureTextEntry autoCapitalize="none" autoComplete="password" textContentType="password" value={password} onChangeText={(value) => { setPassword(value); setError(''); setNotice(''); }} />
          <PrimaryButton label="Create private export" icon="download" loading={exporting} disabled={!password} onPress={() => void exportData()} />
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/privacy-policy')} style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}><View style={styles.linkIcon}><Ionicons name="reader-outline" size={23} color={AppColors.violet} /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>Data practices & retention</Text><Text style={styles.linkDetail}>Review what LifeBook stores and how deletion works.</Text></View><Ionicons name="chevron-forward" size={20} color={AppColors.slate} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/delete-account')} style={({ pressed }) => [styles.dangerCard, pressed && styles.pressed]}><View style={styles.dangerIcon}><Ionicons name="trash-outline" size={23} color={AppColors.danger} /></View><View style={styles.linkCopy}><Text style={styles.dangerTitle}>Delete account and data</Text><Text style={styles.linkDetail}>Permanently remove your account through a recent-authentication check.</Text></View><Ionicons name="chevron-forward" size={20} color={AppColors.danger} /></Pressable>
        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
        {notice ? <View accessibilityRole="alert" style={styles.noticeBox}><Ionicons name="checkmark-circle" size={19} color={AppColors.mint} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud }, content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg }, iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, headerCopy: { flex: 1 }, eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' }, title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '800', marginTop: 3 }, subtitle: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  hero: { flexDirection: 'row', gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: AppColors.ink, ...Shadow.card }, heroIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: AppColors.paper }, heroCopy: { flex: 1 }, heroTitle: { color: AppColors.paper, fontSize: 18, fontWeight: '800' }, heroText: { color: '#C9D0E0', fontSize: 13, lineHeight: 20, marginTop: 5 },
  card: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card }, cardHeading: { flexDirection: 'row', gap: Spacing.md }, cardIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: AppColors.violetSoft }, cardCopy: { flex: 1 }, sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '800' }, helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, minHeight: 62 }, settingCopy: { flex: 1 }, settingTitle: { color: AppColors.ink, fontSize: 15, fontWeight: '700' }, settingDetail: { color: AppColors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, emptyText: { color: AppColors.slate, fontSize: 13, fontStyle: 'italic' }, consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 54 }, consentCopy: { flex: 1 }, consentVersion: { color: AppColors.ink, fontSize: 13, fontWeight: '700' }, consentDate: { color: AppColors.inkMuted, fontSize: 11, marginTop: 3 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line, marginLeft: 34 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 82, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, dangerCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 82, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: AppColors.blushSoft, borderWidth: 1, borderColor: '#F4C8D3' }, linkIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: AppColors.violetSoft }, dangerIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: AppColors.paper }, linkCopy: { flex: 1 }, linkTitle: { color: AppColors.ink, fontSize: 15, fontWeight: '800' }, dangerTitle: { color: AppColors.danger, fontSize: 15, fontWeight: '800' }, linkDetail: { color: AppColors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 }, noticeBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.mintSoft }, noticeText: { flex: 1, color: AppColors.ink, fontSize: 13, lineHeight: 19 }, pressed: { opacity: 0.65 },
});
