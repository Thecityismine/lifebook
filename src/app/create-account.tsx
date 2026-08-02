import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { createParentAccount } from '@/services/auth';

export default function CreateAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; token?: string }>();
  const joiningFamily = params.returnTo === '/join-family' && typeof params.token === 'string';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordLooksValid = password.length >= 8;
  const passwordsMatch = password === confirmation;
  const ready = name.trim().length >= 2 && emailLooksValid && passwordLooksValid && passwordsMatch;

  async function handleCreateAccount() {
    setMessage(null);
    setSubmitting(true);
    const result = await createParentAccount(name, email, password);
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.push({
      pathname: '/verify-email',
      params: {
        email: email.trim(),
        sent: result.verificationSent === false ? '0' : '1',
        ...(joiningFamily ? { returnTo: '/join-family', token: params.token } : {}),
      },
    });
  }

  return (
    <OnboardingShell
      eyebrow="Parent account"
      title="Create your secure parent sign-in"
      subtitle={joiningFamily
        ? 'This verified adult account will use the invitation to join an existing private family space.'
        : 'This account will own the private family space. We’ll send an email to verify the address before setup continues.'}
      onBack={() => router.back()}
      step={2}
      totalSteps={5}
      footer={
        <PrimaryButton
          label="Create parent account"
          disabled={!ready}
          loading={submitting}
          onPress={handleCreateAccount}
          icon="lock-closed"
        />
      }>
      <View style={styles.form}>
        <FormField
          label="Your name"
          placeholder="Your name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setMessage(null);
          }}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Use at least 8 characters. The Firebase project’s password policy may require more."
        />
        <FormField
          label="Confirm password"
          placeholder="Enter it again"
          value={confirmation}
          onChangeText={(value) => {
            setConfirmation(value);
            setMessage(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {confirmation.length > 0 && !passwordsMatch ? <Text style={styles.validation}>Passwords do not match.</Text> : null}
        {message ? (
          <View accessibilityRole="alert" style={styles.notice}>
            <Text style={styles.noticeTitle}>We couldn’t create the account</Text>
            <Text style={styles.noticeBody}>{message}</Text>
          </View>
        ) : null}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.xl },
  validation: { color: AppColors.danger, fontSize: 12, fontWeight: '700', marginTop: -Spacing.md },
  notice: {
    borderRadius: Radius.md,
    backgroundColor: AppColors.sunSoft,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  noticeTitle: { color: AppColors.ink, fontSize: 14, fontWeight: '800' },
  noticeBody: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19 },
});
