import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/providers/auth-provider';
import { createManagedProfile } from '@/services/family';

const relationships = ['My child', 'Grandchild', 'Other'];

export default function ChildScreen() {
  const router = useRouter();
  const { confirmManagedProfileCreated } = useAuthSession();
  const [firstName, setFirstName] = useState('');
  const [relationship, setRelationship] = useState('My child');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = firstName.trim().length >= 2;

  async function handleFinish() {
    setMessage(null);
    setSubmitting(true);
    const result = await createManagedProfile(firstName, relationship);
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (!result.profileId) {
      setMessage('LifeBook could not finish the managed profile. Please try again.');
      return;
    }

    confirmManagedProfileCreated(result.familyId, result.profileId);
    router.replace('/home');
  }

  return (
    <OnboardingShell
      eyebrow="First managed profile"
      title="Whose story are you beginning?"
      subtitle="Add a first name now. More details, permissions, and another parent or guardian can be added after setup."
      onBack={() => router.back()}
      step={5}
      totalSteps={5}
      footer={<PrimaryButton label="Enter LifeBook" disabled={!ready} loading={submitting} onPress={handleFinish} icon="book" />}>
      <View style={styles.profilePreview}>
        <View style={styles.avatar}>
          {firstName.trim() ? (
            <Text style={styles.initial}>{firstName.trim().charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person" size={34} color={AppColors.violet} />
          )}
        </View>
        <View style={styles.previewCopy}>
          <Text style={styles.previewName}>{firstName.trim() || 'First name'}</Text>
          <Text style={styles.previewDetail}>Managed by a parent or guardian</Text>
        </View>
      </View>

      <View style={styles.form}>
        <FormField
          label="First name"
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoComplete="name-given"
          textContentType="givenName"
        />

        <View style={styles.relationshipGroup}>
          <Text style={styles.label}>Your relationship</Text>
          <View style={styles.relationships}>
            {relationships.map((option) => {
              const selected = relationship === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setRelationship(option)}
                  style={({ pressed }) => [styles.relationship, selected && styles.relationshipSelected, pressed && styles.pressed]}>
                  <Text style={[styles.relationshipText, selected && styles.relationshipTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.safetyNote}>
        <Ionicons name="shield-checkmark" size={19} color={AppColors.mint} />
        <Text style={styles.safetyCopy}>This creates a managed profile, not a separate child login.</Text>
      </View>
      {message ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  profilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.xl,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: Radius.full,
    backgroundColor: AppColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: AppColors.violet, fontSize: 26, fontWeight: '800' },
  previewCopy: { flex: 1 },
  previewName: { color: AppColors.ink, fontSize: 18, fontWeight: '800' },
  previewDetail: { color: AppColors.inkMuted, fontSize: 12, marginTop: 4 },
  form: { marginTop: Spacing.xxl, gap: Spacing.xl },
  relationshipGroup: { gap: Spacing.sm },
  label: { color: AppColors.ink, fontSize: 14, fontWeight: '700' },
  relationships: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  relationship: {
    minHeight: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: AppColors.line,
    backgroundColor: AppColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  relationshipSelected: { borderColor: AppColors.violet, backgroundColor: AppColors.violetSoft },
  relationshipText: { color: AppColors.inkMuted, fontSize: 13, fontWeight: '700' },
  relationshipTextSelected: { color: AppColors.violet },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  safetyCopy: { flex: 1, color: AppColors.inkMuted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  notice: { borderRadius: Radius.md, backgroundColor: AppColors.sunSoft, padding: Spacing.lg, marginTop: Spacing.lg },
  noticeText: { color: AppColors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
