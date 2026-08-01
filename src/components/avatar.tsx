import { Image, StyleSheet, Text, View } from 'react-native';

import { AppColors, FontFamily } from '@/constants/theme';

type AvatarProps = {
  initials: string;
  color?: string;
  size?: number;
  badge?: boolean;
  imageUri?: string | null;
};

export function Avatar({ initials, color = AppColors.violet, size = 48, badge = false, imageUri }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
      )}
      {badge ? <View style={[styles.badge, { right: size * 0.02, bottom: size * 0.02 }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: AppColors.paper,
    fontFamily: FontFamily?.bold,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.mint,
    borderWidth: 2,
    borderColor: AppColors.paper,
  },
});
