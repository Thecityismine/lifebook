import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { signInParent } from '@/services/auth';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; token?: string }>();
  const returnTo = params.returnTo === '/delete-account' || params.returnTo === '/join-family' ? params.returnTo : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = email.trim().length > 0 && password.length > 0;

  async function handleSignIn() {
    setMessage(null);
    setSubmitting(true);
    const result = await signInParent(email, password);

    if (!result.ok) {
      setSubmitting(false);
      setMessage(result.message);
      return;
    }

    if (result.emailVerified) {
      if (returnTo) {
        if (returnTo === '/join-family' && typeof params.token === 'string') {
          router.replace({ pathname: '/join-family', params: { token: params.token } });
        } else {
          router.replace('/delete-account');
        }
        return;
      }
      // Stay on this public route until AuthProvider observes the signed-in
      // user. The root guard will then resolve family setup, child setup, or
      // Home without briefly treating the protected route as signed out.
    } else {
      router.replace({
        pathname: '/verify-email',
        params: {
          email: email.trim(),
          ...(returnTo === '/join-family' && typeof params.token === 'string'
            ? { returnTo: '/join-family', token: params.token }
            : {}),
        },
      });
    }
  }

  return (
    <OnboardingShell
      eyebrow="Welcome back"
      title="Open your family LifeBook"
      subtitle="Sign in with the parent or guardian account that owns your private family space."
      onBack={() => router.back()}
      footer={
        <PrimaryButton
          label="Sign in securely"
          disabled={!ready}
          loading={submitting}
          onPress={handleSignIn}
          icon="lock-closed"
        />
      }>
      <View style={styles.form}>
        <FormField
          label="Email address"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setMessage(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormField
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
        />
        {message ? (
          <View accessibilityRole="alert" style={styles.notice}>
            <Text style={styles.noticeTitle}>We couldn’t sign you in</Text>
            <Text style={styles.noticeBody}>{message}</Text>
          </View>
        ) : null}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.xl },
  notice: {
    borderRadius: Radius.md,
    backgroundColor: AppColors.sunSoft,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  noticeTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '800' },
  noticeBody: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
});
