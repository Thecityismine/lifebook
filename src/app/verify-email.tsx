import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { checkParentVerification, resendParentVerification, signOutParent } from '@/services/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { refreshUser } = useAuthSession();
  const params = useLocalSearchParams<{ email?: string; sent?: string; returnTo?: string; token?: string }>();
  const joiningFamily = params.returnTo === '/join-family' && typeof params.token === 'string';
  const [message, setMessage] = useState(
    params.sent === '0' ? 'The account was created, but the verification email could not be sent. Try again below.' : null,
  );
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleCheck() {
    setMessage(null);
    setChecking(true);
    const result = await checkParentVerification();
    setChecking(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (!result.emailVerified) {
      setMessage('That address is not verified yet. Open the email link, then check again.');
      return;
    }

    await refreshUser();
    if (joiningFamily) {
      router.replace({ pathname: '/join-family', params: { token: params.token } });
    } else {
      router.replace('/family');
    }
  }

  async function handleResend() {
    setMessage(null);
    setResending(true);
    const result = await resendParentVerification();
    setResending(false);
    setMessage(result.ok ? 'A new verification email has been sent.' : result.message);
  }

  async function handleDifferentAccount() {
    setMessage(null);
    const result = await signOutParent();
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.replace('/');
  }

  return (
    <OnboardingShell
      eyebrow="Verify your email"
      title="Check your inbox"
      subtitle={`We sent a verification link to ${params.email || 'your email address'}. This helps protect access to your family’s private space.`}
      onBack={() => router.back()}
      step={3}
      totalSteps={5}
      footer={<PrimaryButton label="I verified my email" loading={checking} onPress={handleCheck} icon="checkmark-circle" />}>
      <View style={styles.mailCard}>
        <View style={styles.iconBox}>
          <Ionicons name="mail" size={38} color={AppColors.violet} />
        </View>
        <Text style={styles.cardTitle}>Verification link sent</Text>
        <Text style={styles.cardBody}>The link may take a minute to arrive. Check your spam folder if you do not see it.</Text>
      </View>

      {message ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: resending, disabled: resending }}
        disabled={resending}
        onPress={handleResend}
        style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}>
        <Text style={styles.resendText}>{resending ? 'Sending…' : 'Send another verification email'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={handleDifferentAccount}
        style={({ pressed }) => [styles.differentAccountButton, pressed && styles.pressed]}>
        <Text style={styles.differentAccountText}>Use a different account</Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  mailCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.xxl,
  },
  iconBox: {
    width: 74,
    height: 74,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '800', marginTop: Spacing.lg },
  cardBody: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm },
  notice: { borderRadius: Radius.md, backgroundColor: AppColors.sunSoft, padding: Spacing.lg, marginTop: Spacing.xl },
  noticeText: { color: AppColors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  resendButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  resendText: { color: AppColors.violet, fontSize: 14, fontWeight: '800' },
  differentAccountButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  differentAccountText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
