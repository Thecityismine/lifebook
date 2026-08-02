import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';

const safeguards = [
  { icon: 'person' as const, title: 'Parent-led', body: 'A parent or legal guardian creates and manages the family space.' },
  { icon: 'eye-off' as const, title: 'Private by default', body: 'Profiles and memories are not public or discoverable.' },
  { icon: 'download' as const, title: 'Your family stays in control', body: 'You will be able to review, export, correct, and delete family data.' },
];

export default function ConsentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string; token?: string }>();
  const joiningFamily = params.returnTo === '/join-family' && typeof params.token === 'string';
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingShell
      eyebrow="Family safety"
      title="A private space starts with a responsible adult"
      subtitle="LifeBook is designed around a parent-led account, with children represented as managed profiles rather than independent accounts."
      onBack={() => router.back()}
      step={1}
      totalSteps={5}
      footer={<PrimaryButton label="Continue" disabled={!confirmed} onPress={() => joiningFamily
        ? router.push({ pathname: '/create-account', params: { returnTo: '/join-family', token: params.token } })
        : router.push('/create-account')} />}>
      <View style={styles.list}>
        {safeguards.map((item) => (
          <View key={item.title} style={styles.safeguard}>
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={21} color={AppColors.violet} />
            </View>
            <View style={styles.safeguardCopy}>
              <Text style={styles.safeguardTitle}>{item.title}</Text>
              <Text style={styles.safeguardBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        onPress={() => setConfirmed((value) => !value)}
        style={({ pressed }) => [styles.confirmation, confirmed && styles.confirmationChecked, pressed && styles.pressed]}>
        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
          {confirmed ? <Ionicons name="checkmark" size={18} color={AppColors.paper} /> : null}
        </View>
        <Text style={styles.confirmationText}>I am a parent or legal guardian and I understand that I am responsible for this family space.</Text>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  safeguard: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.lg,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.violetSoft,
  },
  safeguardCopy: { flex: 1 },
  safeguardTitle: { color: AppColors.ink, fontSize: 15, fontWeight: '800' },
  safeguardBody: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  confirmation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AppColors.line,
    padding: Spacing.lg,
  },
  confirmationChecked: { borderColor: AppColors.violet, backgroundColor: AppColors.violetSoft },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: AppColors.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: AppColors.violet, backgroundColor: AppColors.violet },
  confirmationText: { flex: 1, color: AppColors.ink, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
