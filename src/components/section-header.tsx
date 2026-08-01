import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, FontFamily, Spacing } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export function SectionHeader({ title, action, onPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={12}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  title: {
    color: AppColors.ink,
    fontFamily: FontFamily?.bold,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  action: {
    color: AppColors.violet,
    fontFamily: FontFamily?.medium,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: Spacing.xs,
  },
  pressed: {
    opacity: 0.55,
  },
});
