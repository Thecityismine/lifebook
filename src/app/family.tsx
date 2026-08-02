import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { createFamilySpace } from '@/services/family';

export default function FamilyScreen() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = familyName.trim().length >= 2;

  async function handleContinue() {
    setMessage(null);
    setSubmitting(true);
    const result = await createFamilySpace(familyName);
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.replace('/child');
  }

  return (
    <OnboardingShell
      eyebrow="Your family space"
      title="Give your private LifeBook a name"
      subtitle="This is the shared space where authorized parents and guardians will care for your family’s people and memories."
      onBack={() => router.back()}
      step={4}
      totalSteps={5}
      footer={
        <PrimaryButton
          label="Continue"
          disabled={!ready}
          loading={submitting}
          loadingLabel="Creating family space..."
          onPress={handleContinue}
        />
      }>
      <View style={styles.familyCard}>
        <View style={styles.familyIcon}>
          <Ionicons name="home" size={30} color={AppColors.violet} />
        </View>
        <Text style={styles.cardTitle}>{familyName.trim() || 'Your family LifeBook'}</Text>
        <Text style={styles.cardBody}>Only invited family members will have access.</Text>
      </View>

      <View style={styles.form}>
        <FormField
          label="Family space name"
          placeholder="For example, The Morgan family"
          value={familyName}
          onChangeText={setFamilyName}
          autoCapitalize="words"
          autoComplete="off"
          hint="You can change this later. It will not be visible publicly."
        />
        {message ? (
          <View accessibilityRole="alert" style={styles.notice}>
            <Text style={styles.noticeText}>{message}</Text>
          </View>
        ) : null}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  familyCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.xxl,
  },
  familyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: AppColors.ink, fontSize: 19, fontWeight: '800', marginTop: Spacing.lg },
  cardBody: { color: AppColors.inkMuted, fontSize: 13, marginTop: Spacing.xs, textAlign: 'center' },
  form: { marginTop: Spacing.xxl },
  notice: { borderRadius: Radius.md, backgroundColor: AppColors.sunSoft, padding: Spacing.lg, marginTop: Spacing.lg },
  noticeText: { color: AppColors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
