import { Platform } from 'react-native';

export const AppColors = {
  ink: '#17213F',
  inkMuted: '#5F6880',
  slate: '#7E879D',
  violet: '#6956E8',
  violetDark: '#5140CE',
  violetSoft: '#EEEAFE',
  sky: '#4A9BF7',
  skySoft: '#EAF4FF',
  mint: '#51C99A',
  mintSoft: '#E7F8F1',
  sun: '#F4B942',
  sunSoft: '#FFF5D9',
  blush: '#ED7D9B',
  blushSoft: '#FDECF1',
  cloud: '#F7F8FC',
  paper: '#FFFFFF',
  border: '#E8EAF2',
  line: '#DDE1EC',
  danger: '#C94E62',
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
    text: AppColors.paper,
    background: '#101526',
    backgroundElement: '#1B2237',
    backgroundSelected: '#2B3150',
    textSecondary: '#BDC4D7',
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
      shadowColor: '#17213F',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
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
      shadowColor: '#17213F',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.04,
      shadowRadius: 14,
    },
    android: { elevation: 10 },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
