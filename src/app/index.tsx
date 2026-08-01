import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { PrimaryButton } from '@/components/primary-button';
import { AppColors, FontFamily, Radius, Spacing } from '@/constants/theme';

const promises = [
  { icon: 'lock-closed' as const, text: 'Private to your family' },
  { icon: 'people' as const, text: 'Led by a parent or guardian' },
  { icon: 'heart' as const, text: 'Built for stories, not likes' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      eyebrow="A private family archive"
      title="Remember your people. Keep your shared history."
      subtitle="LifeBook gives your family one thoughtful place for the people, memories, and chapters that shape a life."
      footer={
        <View style={styles.actions}>
          <PrimaryButton label="Start your family LifeBook" onPress={() => router.push('/consent')} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-in')}
            style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}>
            <Text style={styles.signInCopy}>Already have an account?</Text>
            <Text style={styles.signInAction}>Sign in</Text>
          </Pressable>
        </View>
      }>
      <View style={styles.hero}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.bookMark}>
          <Ionicons name="book" size={39} color={AppColors.violet} />
        </View>
        <View style={styles.connectionRow}>
          <View style={[styles.dot, { backgroundColor: AppColors.sky }]} />
          <View style={styles.connectionLine} />
          <View style={[styles.dot, { backgroundColor: AppColors.mint }]} />
          <View style={styles.connectionLine} />
          <View style={[styles.dot, { backgroundColor: AppColors.blush }]} />
        </View>
      </View>

      <View style={styles.promises}>
        {promises.map((item) => (
          <View key={item.text} style={styles.promiseRow}>
            <View style={styles.promiseIcon}>
              <Ionicons name={item.icon} size={17} color={AppColors.violet} />
            </View>
            <Text style={styles.promiseText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 214,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -50,
    top: -70,
    backgroundColor: '#413884',
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    left: -30,
    bottom: -70,
    backgroundColor: '#235064',
  },
  bookMark: {
    width: 78,
    height: 78,
    borderRadius: Radius.xl,
    backgroundColor: AppColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl },
  dot: { width: 11, height: 11, borderRadius: Radius.full },
  connectionLine: { width: 44, height: 2, backgroundColor: '#7E75BC' },
  promises: { marginTop: Spacing.xxl, gap: Spacing.md },
  promiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  promiseIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: AppColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: { color: AppColors.ink, fontFamily: FontFamily?.medium, fontSize: 14, fontWeight: '600' },
  actions: { gap: Spacing.md },
  signInButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  signInCopy: { color: AppColors.inkMuted, fontSize: 14 },
  signInAction: { color: AppColors.violet, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.6 },
});
