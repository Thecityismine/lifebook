import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '@/constants/theme';
import type { ReminderKind } from '@/services/reminders';

export const REMINDER_KIND_OPTIONS: {
  key: ReminderKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  softColor: string;
}[] = [
  { key: 'birthday', label: 'Birthday', icon: 'gift-outline', color: AppColors.sun, softColor: AppColors.sunSoft },
  { key: 'appointment', label: 'Appointment', icon: 'calendar-outline', color: AppColors.sky, softColor: AppColors.skySoft },
  { key: 'school', label: 'School', icon: 'school-outline', color: AppColors.violet, softColor: AppColors.violetSoft },
  { key: 'activity', label: 'Activity', icon: 'football-outline', color: AppColors.mint, softColor: AppColors.mintSoft },
  { key: 'milestone', label: 'Milestone', icon: 'flag-outline', color: AppColors.blush, softColor: AppColors.blushSoft },
  { key: 'other', label: 'Other', icon: 'notifications-outline', color: AppColors.slate, softColor: AppColors.cloud },
];

export function reminderKind(kind: ReminderKind) {
  return REMINDER_KIND_OPTIONS.find((option) => option.key === kind) || REMINDER_KIND_OPTIONS[5];
}
