import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, FontFamily, Radius, Spacing } from '@/constants/theme';

type ActionIcon =
  | 'search-outline'
  | 'settings-outline'
  | 'ellipsis-horizontal'
  | 'person-add'
  | 'calendar-outline';

type ScreenTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionIcon?: ActionIcon;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionIcon?: ActionIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function ScreenTitle({
  eyebrow,
  title,
  subtitle,
  actionIcon,
  actionLabel,
  onAction,
  secondaryActionIcon,
  secondaryActionLabel,
  onSecondaryAction,
}: ScreenTitleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>
        {secondaryActionIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryActionLabel}
            onPress={onSecondaryAction}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name={secondaryActionIcon} size={23} color={AppColors.ink} />
          </Pressable>
        ) : null}
        {actionIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name={actionIcon} size={23} color={AppColors.ink} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  copy: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eyebrow: {
    color: AppColors.violet,
    fontFamily: FontFamily?.medium,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: AppColors.ink,
    fontFamily: FontFamily?.bold,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: AppColors.inkMuted,
    fontFamily: FontFamily?.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.97 }],
  },
});
