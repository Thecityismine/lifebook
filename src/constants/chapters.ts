import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '@/constants/theme';
import type { ChapterColorKey, ChapterIconKey } from '@/services/chapters';

export const CHAPTER_ICON_OPTIONS: {
  key: ChapterIconKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'school', label: 'School', icon: 'school-outline' },
  { key: 'sport', label: 'Activity', icon: 'football-outline' },
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline' },
  { key: 'milestone', label: 'Milestone', icon: 'flag-outline' },
  { key: 'other', label: 'Other', icon: 'sparkles-outline' },
];

export const CHAPTER_COLOR_OPTIONS: {
  key: ChapterColorKey;
  label: string;
  color: string;
  softColor: string;
}[] = [
  { key: 'violet', label: 'Violet', color: AppColors.violet, softColor: AppColors.violetSoft },
  { key: 'mint', label: 'Mint', color: AppColors.mint, softColor: AppColors.mintSoft },
  { key: 'sun', label: 'Sun', color: AppColors.sun, softColor: AppColors.sunSoft },
  { key: 'blush', label: 'Blush', color: AppColors.blush, softColor: AppColors.blushSoft },
  { key: 'sky', label: 'Sky', color: AppColors.sky, softColor: AppColors.skySoft },
];

export function chapterIcon(iconKey: ChapterIconKey) {
  return CHAPTER_ICON_OPTIONS.find((option) => option.key === iconKey) || CHAPTER_ICON_OPTIONS[5];
}

export function chapterColor(colorKey: ChapterColorKey) {
  return CHAPTER_COLOR_OPTIONS.find((option) => option.key === colorKey) || CHAPTER_COLOR_OPTIONS[0];
}
