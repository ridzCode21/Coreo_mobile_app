/**
 * Account-level enums shared by auth (register/profile) and onboarding (About You collects
 * gender for the Mifflin-St Jeor estimate — API_REFERENCE.md §17). Kept separate from
 * `shared/types/dietProfile.ts` since gender belongs to the user/account domain, not the diet
 * profile, even though the diet estimate reads it.
 */
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

export const ACTIVE_PILLARS = ['diet', 'fitness', 'wellness'] as const;
export type ActivePillar = (typeof ACTIVE_PILLARS)[number];

export const CALIBRATION_WAVES = ['dashed', 'solid'] as const;
export type CalibrationWave = (typeof CALIBRATION_WAVES)[number];

export type CalibrationState = {
  calibration_day: number | null;
  calibration_complete: boolean;
  wave: CalibrationWave | null;
};

export const INTERVIEW_GOALS = [
  'get_stronger',
  'sleep_better',
  'less_stress',
  'lose_weight',
  'more_energy',
  'eat_healthier',
] as const;
export type InterviewGoal = (typeof INTERVIEW_GOALS)[number];
