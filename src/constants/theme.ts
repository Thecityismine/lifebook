import { Platform } from 'react-native';

export const AppColors = {
  ink: '#F4F6FF',
  inkMuted: '#B8C0D4',
  slate: '#8F9AB3',
  violet: '#8B7CFF',
  violetDark: '#725FFF',
  violetSoft: '#292447',
  sky: '#68AEFF',
  skySoft: '#172C45',
  mint: '#65D8AC',
  mintSoft: '#17372F',
  sun: '#F6C75B',
  sunSoft: '#3B311C',
  blush: '#F08AA5',
  blushSoft: '#3D222D',
  cloud: '#0C1120',
  paper: '#171D2E',
  border: '#2A344C',
  line: '#35415D',
  danger: '#FF8396',
  hero: '#1B243D',
  onAccent: '#0C1120',
  onDark: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    text: AppColors.ink,
    background: AppColors.cloud,
    backgroundElement: AppColors.paper,
    backgroundSelected: AppColors.violetSoft,
    textSecondary: AppColors.inkMuted,
  },
  dark: {
    text: AppColors.ink,
    background: AppColors.cloud,
    backgroundElement: AppColors.paper,
    backgroundSelected: AppColors.violetSoft,
    textSecondary: AppColors.inkMuted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const FontFamily = Platform.select({
  ios: {
    regular: 'Avenir Next',
    medium: 'Avenir Next',
    bold: 'Avenir Next',
  },
  android: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    bold: 'sans-serif',
  },
  default: {
    regular: 'sans-serif',
    medium: 'sans-serif',
    bold: 'sans-serif',
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: AppColors.violet,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
    },
    android: { elevation: 7 },
    default: {},
  }),
  navigation: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
    },
    android: { elevation: 10 },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
