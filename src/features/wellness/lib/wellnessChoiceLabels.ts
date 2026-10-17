import type {
  CheckInStyle,
  MorningFirst,
  WellnessFocus,
  WhatHelps,
} from '@/shared/types/wellnessProfile';

export const wellnessFocusLabels: Record<WellnessFocus, string> = {
  sleep: 'Sleep',
  racing_mind: 'A racing mind',
  work_stress: 'Work stress',
  low_energy: 'Low energy',
  mood_dips: 'Mood dips',
};

export const morningFirstLabels: Record<MorningFirst, string> = {
  bathroom: 'Straight to the bathroom',
  phone: 'Check my phone',
  tea_or_coffee: 'Tea or coffee first',
  snooze: 'Snooze, twice',
  rush_out: 'Rush straight out',
};

export const whatHelpsLabels: Record<WhatHelps, string> = {
  walks: 'Walks',
  music: 'Music',
  chai: 'Chai on the balcony',
  prayer: 'Prayer',
  talking_it_out: 'Talking it out',
  havent_found_it: "Haven't found it",
};

export const checkInStyleLabels: Record<CheckInStyle, string> = {
  step_in: 'Step in before it builds',
  only_when_i_come: 'Only when I come to you',
};
