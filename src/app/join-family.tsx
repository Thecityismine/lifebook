import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { acceptFamilyInvite, previewFamilyInvite, type InvitePreview } from '@/services/collaboration';

const subscribeToHydration = () => () => undefined;
const browserSnapshot = () => true;
const serverSnapshot = () => false;

export default function JoinFamilyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { user, setup } = useAuthSession();
  const hydrated = useSyncExternalStore(subscribeToHydration, browserSnapshot, serverSnapshot);
  const token = typeof params.token === 'string' ? params.token : '';
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptedFamilyId, setAcceptedFamilyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !user?.emailVerified || acceptedFamilyId) return;
    let active = true;
    previewFamilyInvite(token).then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.ok) { setError(result.message); return; }
      setPreview(result);
    });
    return () => { active = false; };
  }, [acceptedFamilyId, token, user?.emailVerified]);

  useEffect(() => {
    if (acceptedFamilyId && setup?.familyId === acceptedFamilyId) router.replace('/home');
  }, [acceptedFamilyId, router, setup?.familyId]);

  async function handleAccept() {
    setError(''); setAccepting(true);
    const result = await acceptFamilyInvite(token, confirmed);
    setAccepting(false);
    if (!result.ok) { setError(result.message); return; }
    setAcceptedFamilyId(result.familyId);
  }

  if (!hydrated) {
    return <OnboardingShell eyebrow="Private family invitation" title="Opening your secure invitation" subtitle="LifeBook is preparing the verified invitation checkpoint."><View style={styles.stateCard}><ActivityIndicator color={AppColors.violet} /><Text style={styles.detail}>Loading invitation…</Text></View></OnboardingShell>;
  }

  if (!token) {
    return <OnboardingShell eyebrow="Invitation unavailable" title="This family link is incomplete" subtitle="Ask the family owner to create and share a new invitation." onBack={() => router.replace('/')}><View style={styles.stateCard}><Ionicons name="link-outline" size={38} color={AppColors.slate} /><Text style={styles.stateTitle}>No secure invitation token was found</Text><Text style={styles.detail}>Opening LifeBook without the full link cannot grant access to a private family.</Text></View></OnboardingShell>;
  }

  if (!user) {
    return (
      <OnboardingShell eyebrow="Private family invitation" title="Join a private family LifeBook" subtitle="Sign in or create a verified adult account using the exact email address that received this secure link." onBack={() => router.replace('/')}>
        <View style={styles.heroCard}><View style={styles.iconBox}><Ionicons name="people" size={34} color={AppColors.violet} /></View><Text style={styles.stateTitle}>Invitation-only access</Text><Text style={styles.detail}>The link expires after seven days and does not reveal family records. LifeBook checks the invitation only after email verification.</Text></View>
        <View style={styles.actions}><PrimaryButton label="Sign in to continue" icon="log-in" onPress={() => router.push({ pathname: '/sign-in', params: { returnTo: '/join-family', token } })} /><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/consent', params: { returnTo: '/join-family', token } })} style={styles.secondaryButton}><Text style={styles.secondaryLabel}>Create an adult account</Text></Pressable></View>
      </OnboardingShell>
    );
  }

  if (!user.emailVerified) {
    return <OnboardingShell eyebrow="One safety step" title="Verify your email to continue" subtitle={`LifeBook must verify ${user.email || 'your email'} before it can match this invitation.`} onBack={() => router.replace('/')} footer={<PrimaryButton label="Open email verification" icon="mail" onPress={() => router.push({ pathname: '/verify-email', params: { email: user.email || '', returnTo: '/join-family', token } })} />}><View style={styles.stateCard}><Ionicons name="shield-checkmark-outline" size={40} color={AppColors.mint} /><Text style={styles.detail}>After verifying, return here to review the family name and role before joining.</Text></View></OnboardingShell>;
  }

  if (acceptedFamilyId) {
    return <OnboardingShell eyebrow="Invitation accepted" title="Opening your family LifeBook" subtitle="Your verified account now has private family access."><View style={styles.stateCard}><ActivityIndicator color={AppColors.violet} /><Text style={styles.detail}>Securely loading the family archive…</Text></View></OnboardingShell>;
  }

  return (
    <OnboardingShell
      eyebrow="Review invitation"
      title={preview ? `Join ${preview.familyName}` : 'Checking your family invitation'}
      subtitle={preview ? `You are joining as a ${preview.role === 'guardian' ? 'Guardian' : 'Viewer'}. Review the responsibility statement before accepting.` : 'LifeBook is matching the secure link to your verified email.'}
      onBack={() => router.replace('/')}>
      {loading ? <View style={styles.stateCard}><ActivityIndicator color={AppColors.violet} /><Text style={styles.detail}>Checking the invitation…</Text></View> : null}
      {preview ? <View style={styles.inviteCard}><View style={styles.inviteRow}><View style={[styles.iconBox, { backgroundColor: preview.role === 'guardian' ? AppColors.mintSoft : AppColors.skySoft }]}><Ionicons name={preview.role === 'guardian' ? 'create-outline' : 'eye-outline'} size={30} color={preview.role === 'guardian' ? AppColors.mint : AppColors.sky} /></View><View style={styles.inviteCopy}><Text style={styles.familyName}>{preview.familyName}</Text><Text style={styles.role}>{preview.role === 'guardian' ? 'Guardian · can contribute when enabled' : 'Viewer · read-only access'}</Text><Text style={styles.email}>{preview.email}</Text></View></View><View style={styles.divider} /><Text style={styles.detail}>Every protected record remains visible only to verified members of this family space.</Text></View> : null}
      {preview ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => { setConfirmed((value) => !value); setError(''); }} style={[styles.confirmation, confirmed && styles.confirmationChecked]}><View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>{confirmed ? <Ionicons name="checkmark" size={18} color={AppColors.paper} /> : null}</View><Text style={styles.confirmationText}>I am an adult responsible for using this private family space appropriately and I accept the parent-led privacy notice.</Text></Pressable> : null}
      {preview ? <View style={styles.actions}><PrimaryButton label="Accept and join family" icon="people" loading={accepting} disabled={!confirmed} onPress={() => void handleAccept()} /></View> : null}
      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle" size={20} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', padding: Spacing.xxl, borderRadius: Radius.xl, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, stateCard: { alignItems: 'center', gap: Spacing.lg, padding: Spacing.xxl, borderRadius: Radius.xl, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, iconBox: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.xl, backgroundColor: AppColors.violetSoft }, stateTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '800', marginTop: Spacing.lg, textAlign: 'center' }, detail: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm }, actions: { gap: Spacing.md, marginTop: Spacing.xl }, secondaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.violet }, secondaryLabel: { color: AppColors.violet, fontSize: 14, fontWeight: '800' },
  inviteCard: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border }, inviteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }, inviteCopy: { flex: 1 }, familyName: { color: AppColors.ink, fontSize: 18, fontWeight: '800' }, role: { color: AppColors.violet, fontSize: 12, fontWeight: '700', marginTop: 4 }, email: { color: AppColors.inkMuted, fontSize: 12, marginTop: 4 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: AppColors.line },
  confirmation: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginTop: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.line }, confirmationChecked: { borderColor: AppColors.violet, backgroundColor: AppColors.violetSoft }, checkbox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 2, borderColor: AppColors.slate }, checkboxChecked: { backgroundColor: AppColors.violet, borderColor: AppColors.violet }, confirmationText: { flex: 1, color: AppColors.ink, fontSize: 13, lineHeight: 20, fontWeight: '600' }, errorBox: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft }, errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
});
