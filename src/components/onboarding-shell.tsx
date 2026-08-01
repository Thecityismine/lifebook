import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type OnboardingShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
}>;

export function OnboardingShell({
  eyebrow,
  title,
  subtitle,
  footer,
  onBack,
  step,
  totalSteps = 3,
  children,
}: OnboardingShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <View style={styles.topRow}>
              {onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={8}
                  onPress={onBack}
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                  <Ionicons name="arrow-back" size={22} color={AppColors.ink} />
                </Pressable>
              ) : (
                <View style={styles.brandMark}>
                  <Ionicons name="book" size={20} color={AppColors.violet} />
                </View>
              )}
              <Text style={styles.brand}>LifeBook</Text>
              {step ? <Text style={styles.stepLabel}>Step {step} of {totalSteps}</Text> : <View style={styles.spacer} />}
            </View>

            {step ? (
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: totalSteps, now: step }} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
              </View>
            ) : null}

            <View style={styles.heading}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.body}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 620),
    minHeight: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46 },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.violetSoft,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  brand: {
    color: AppColors.violet,
    fontFamily: FontFamily?.bold,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: Spacing.sm,
  },
  stepLabel: { marginLeft: 'auto', color: AppColors.inkMuted, fontSize: 12, fontWeight: '700' },
  spacer: { flex: 1 },
  progressTrack: {
    height: 5,
    marginTop: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: AppColors.line,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full, backgroundColor: AppColors.violet },
  heading: { marginTop: Spacing.section },
  eyebrow: {
    color: AppColors.violet,
    fontFamily: FontFamily?.medium,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    color: AppColors.ink,
    fontFamily: FontFamily?.bold,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: Spacing.sm,
  },
  subtitle: {
    color: AppColors.inkMuted,
    fontFamily: FontFamily?.regular,
    fontSize: 15,
    lineHeight: 23,
    marginTop: Spacing.sm,
  },
  body: { flex: 1, marginTop: Spacing.xxxl },
  footer: { marginTop: Spacing.xxl },
  pressed: { opacity: 0.62 },
});
