import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, FontFamily, Radius, Spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  loadingLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
  loading = false,
  loadingLabel,
}: PrimaryButtonProps) {
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.button, unavailable && styles.disabled, pressed && !unavailable && styles.pressed]}>
      {loading ? (
        <>
          <ActivityIndicator color={AppColors.onAccent} />
          {loadingLabel ? <Text style={styles.label}>{loadingLabel}</Text> : null}
        </>
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          <Ionicons name={icon} size={20} color={AppColors.onAccent} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: Radius.lg,
    backgroundColor: AppColors.violet,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    color: AppColors.onAccent,
    fontFamily: FontFamily?.medium,
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    backgroundColor: '#3A4260',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
