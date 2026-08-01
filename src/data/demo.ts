import { AppColors } from '@/constants/theme';

export const people = [
  { id: 'ethan', initials: 'EJ', name: 'Ethan Johnson', detail: 'Best friend · School', color: AppColors.sky },
  { id: 'mason', initials: 'MW', name: 'Mason Williams', detail: 'Soccer team', color: AppColors.mint },
  { id: 'ava', initials: 'AM', name: 'Ava Martinez', detail: 'Dance class', color: AppColors.blush },
  { id: 'noah', initials: 'NB', name: 'Noah Brown', detail: 'Neighbor · Minecraft', color: AppColors.sun },
  { id: 'olivia', initials: 'OW', name: 'Olivia Wilson', detail: 'Summer camp', color: AppColors.violet },
];

export const memories = [
  {
    id: 'science-fair',
    month: 'MAY',
    day: '20',
    title: 'The science fair',
    detail: 'Built a solar system with Ethan and Mason.',
    people: ['EJ', 'MW'],
    color: AppColors.violet,
    softColor: AppColors.violetSoft,
    icon: 'sparkles' as const,
  },
  {
    id: 'soccer',
    month: 'APR',
    day: '15',
    title: 'First tournament win',
    detail: 'The team won 3–1. Everyone celebrated afterward.',
    people: ['MW'],
    color: AppColors.mint,
    softColor: AppColors.mintSoft,
    icon: 'football' as const,
  },
  {
    id: 'sleepover',
    month: 'MAR',
    day: '08',
    title: 'Friday sleepover',
    detail: 'Pizza, board games, and a movie fort in the living room.',
    people: ['EJ', 'NB'],
    color: AppColors.blush,
    softColor: AppColors.blushSoft,
    icon: 'moon' as const,
  },
];

export const chapters = [
  {
    id: 'fifth-grade',
    title: 'Fifth grade',
    detail: 'Lincoln Elementary · 2026–27',
    memoryCount: 12,
    peopleCount: 24,
    color: AppColors.violet,
    softColor: AppColors.violetSoft,
    icon: 'school-outline' as const,
  },
  {
    id: 'soccer',
    title: 'Spring soccer',
    detail: 'Tigers · Spring 2026',
    memoryCount: 8,
    peopleCount: 11,
    color: AppColors.mint,
    softColor: AppColors.mintSoft,
    icon: 'football-outline' as const,
  },
  {
    id: 'summer-camp',
    title: 'Summer camp',
    detail: 'Pine Ridge · July 2026',
    memoryCount: 3,
    peopleCount: 6,
    color: AppColors.sun,
    softColor: AppColors.sunSoft,
    icon: 'bonfire-outline' as const,
  },
];
