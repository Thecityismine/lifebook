import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { reauthenticateParent, signOutParent } from '@/services/auth';
import { requestAccountDeletion } from '@/services/privacy';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, initializing } = useAuthSession();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') {
      setError('Type DELETE exactly to confirm this permanent action.');
      return;
    }
    setDeleting(true); setError('');
    const authResult = await reauthenticateParent(password);
    if (!authResult.ok) { setDeleting(false); setError(authResult.message); return; }
    const result = await requestAccountDeletion();
    setDeleting(false); setPassword(''); setConfirmation('');
    if (!result.ok) { setError(result.message); return; }
    setRequestId(result.requestId || 'completed');
    await signOutParent();
  };

  if (initializing) {
    return <View style={styles.loading}><ActivityIndicator color={AppColors.violet} /><Text style={styles.helper}>Checking secure account access…</Text></View>;
  }

  if (requestId) {
    return <OnboardingShell eyebrow="Deletion complete" title="Your deletion request is finished" subtitle="The account can no longer sign in. LifeBook removed the data controlled by this account according to the family ownership rules." footer={<PrimaryButton label="Return to LifeBook" onPress={() => router.replace('/')} />}><View style={styles.successCard}><Ionicons name="checkmark-circle" size={42} color={AppColors.mint} /><Text style={styles.successTitle}>Account deleted</Text><Text style={styles.helper}>Confirmation: {requestId}</Text><Text style={styles.detail}>A content-free operational receipt is retained for no more than 30 days, then removed automatically.</Text></View></OnboardingShell>;
  }

  if (!user) {
    return <OnboardingShell eyebrow="Public deletion request" title="Delete your LifeBook account" subtitle="Sign in to verify ownership and permanently remove your account without contacting support." onBack={() => router.canGoBack() ? router.back() : router.replace('/')} footer={<PrimaryButton label="Sign in to request deletion" icon="log-in" onPress={() => router.push({ pathname: '/sign-in', params: { returnTo: '/delete-account' } })} />}><View style={styles.infoCard}><Ionicons name="shield-checkmark" size={28} color={AppColors.violet} /><Text style={styles.infoTitle}>Why sign-in is required</Text><Text style={styles.detail}>Family archives contain private information. LifeBook verifies the account and asks for the password again before any deletion begins.</Text></View><Pressable accessibilityRole="link" onPress={() => router.push('/privacy-policy')} style={styles.policyLink}><Text style={styles.policyText}>Review data practices and retention</Text><Ionicons name="arrow-forward" size={18} color={AppColors.violet} /></Pressable></OnboardingShell>;
  }

  if (!user.emailVerified) {
    return <OnboardingShell eyebrow="Verification required" title="Verify this email first" subtitle="Only a verified account holder can permanently delete a private family archive." onBack={() => router.back()} footer={<PrimaryButton label="Return to verification" onPress={() => router.replace({ pathname: '/verify-email', params: { email: user.email || '' } })} />}><View style={styles.infoCard}><Text style={styles.infoTitle}>{user.email}</Text><Text style={styles.detail}>Complete email verification, then return to this public deletion page.</Text></View></OnboardingShell>;
  }

  const ready = password.length > 0 && confirmation === 'DELETE';
  return (
    <OnboardingShell eyebrow="Permanent account action" title="Delete account and associated data" subtitle="This action cannot be undone. Review the scope, confirm your password, and type DELETE to continue." onBack={() => router.back()}>
      <View style={styles.warningCard}><Ionicons name="warning" size={28} color={AppColors.danger} /><View style={styles.warningCopy}><Text style={styles.warningTitle}>What will be removed</Text><Text style={styles.detail}>A sole owner removes the family archive, media, user records, consent history, and Authentication account. A guardian removes their account and family membership without deleting the shared family archive.</Text></View></View>
      <View style={styles.transferNote}><Ionicons name="people" size={20} color={AppColors.sun} /><Text style={styles.detail}>An owner with other family members must transfer ownership first. This prevents one adult from silently deleting another adult’s shared archive.</Text></View>
      <View style={styles.form}>
        <FormField label="Confirm your password" placeholder="Your account password" secureTextEntry autoCapitalize="none" autoComplete="password" textContentType="password" value={password} onChangeText={(value) => { setPassword(value); setError(''); }} />
        <FormField label="Type DELETE" placeholder="DELETE" autoCapitalize="characters" maxLength={6} value={confirmation} onChangeText={(value) => { setConfirmation(value); setError(''); }} hint="This confirmation is case-sensitive." />
      </View>
      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready, busy: deleting }} disabled={!ready || deleting} onPress={() => void deleteAccount()} style={({ pressed }) => [styles.deleteButton, !ready && styles.disabled, pressed && ready && styles.pressed]}>{deleting ? <ActivityIndicator color={AppColors.onAccent} /> : <><Text style={styles.deleteText}>Permanently delete account</Text><Ionicons name="trash" size={20} color={AppColors.onAccent} /></>}</Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/privacy-policy')} style={styles.policyLink}><Text style={styles.policyText}>Review data practices and retention</Text><Ionicons name="arrow-forward" size={18} color={AppColors.violet} /></Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl, backgroundColor: AppColors.cloud }, helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  infoCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.violetSoft }, infoTitle: { color: AppColors.ink, fontSize: 17, fontWeight: '800' }, detail: { flex: 1, color: AppColors.inkMuted, fontSize: 13, lineHeight: 20 },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.blushSoft, borderWidth: 1, borderColor: AppColors.blush }, warningCopy: { flex: 1 }, warningTitle: { color: AppColors.danger, fontSize: 16, fontWeight: '800', marginBottom: 5 }, transferNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.sunSoft }, form: { gap: Spacing.xl, marginTop: Spacing.xxl },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 }, deleteButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.danger }, deleteText: { color: AppColors.onAccent, fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.42 }, pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  policyLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg }, policyText: { color: AppColors.violet, fontSize: 13, fontWeight: '700' }, successCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl, borderRadius: Radius.lg, backgroundColor: AppColors.mintSoft }, successTitle: { color: AppColors.ink, fontSize: 20, fontWeight: '800' },
});
