import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { AppColors, FontFamily, Radius, Spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
  loading = false,
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
        <ActivityIndicator color={AppColors.paper} />
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          <Ionicons name={icon} size={20} color={AppColors.paper} />
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
    color: AppColors.paper,
    fontFamily: FontFamily?.medium,
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    backgroundColor: '#B8B1EA',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
