import { z } from 'zod';

import { toggleExclusiveChoice } from '@/shared/types/fitnessProfile';

export const WELLNESS_FOCUS = [
  'sleep',
  'racing_mind',
  'work_stress',
  'low_energy',
  'mood_dips',
] as const;

export type WellnessFocus = (typeof WELLNESS_FOCUS)[number];

export const MORNING_FIRST = ['bathroom', 'phone', 'tea_or_coffee', 'snooze', 'rush_out'] as const;

export type MorningFirst = (typeof MORNING_FIRST)[number];

export const WHAT_HELPS = [
  'walks',
  'music',
  'chai',
  'prayer',
  'talking_it_out',
  'havent_found_it',
] as const;

export type WhatHelps = (typeof WHAT_HELPS)[number];

export const CHECK_IN_STYLE = ['step_in', 'only_when_i_come'] as const;

export type CheckInStyle = (typeof CHECK_IN_STYLE)[number];

const wellnessFocusSchema = z.enum(WELLNESS_FOCUS);
const morningFirstSchema = z.enum(MORNING_FIRST);
const whatHelpsSchema = z.enum(WHAT_HELPS);
const checkInStyleSchema = z.enum(CHECK_IN_STYLE);

export const wellnessProfileSchema = z
  .object({
    wellness_interview_complete: z.boolean(),
    wellness_focus: z.union([wellnessFocusSchema, z.literal('')]),
    nights_note: z.string().max(2000),
    nights_tags: z.array(z.string()),
    morning_first: z.union([morningFirstSchema, z.literal('')]),
    what_helps: z.array(whatHelpsSchema),
    check_in_style: z.union([checkInStyleSchema, z.literal('')]),
    hide_numbers: z.boolean(),
  })
  .strict();

const uniqueWhatHelps = z
  .array(whatHelpsSchema)
  .min(1)
  .refine((items) => new Set(items).size === items.length)
  .refine((items) => !items.includes('havent_found_it') || items.length === 1);

export const wellnessProfilePatchSchema = z
  .object({
    wellness_focus: z.union([wellnessFocusSchema, z.literal('')]).optional(),
    nights_note: z.string().trim().max(2000).optional(),
    morning_first: z.union([morningFirstSchema, z.literal('')]).optional(),
    what_helps: uniqueWhatHelps.optional(),
    check_in_style: z.union([checkInStyleSchema, z.literal('')]).optional(),
    hide_numbers: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0);

export type WellnessProfile = z.infer<typeof wellnessProfileSchema>;

export type WellnessProfilePatch = z.infer<typeof wellnessProfilePatchSchema>;

type WellnessCompletionFields = Pick<
  WellnessProfile,
  'wellness_focus' | 'morning_first' | 'check_in_style'
> & { what_helps: readonly string[] };

export function computeWellnessInterviewComplete(profile: WellnessCompletionFields): boolean {
  return Boolean(
    profile.wellness_focus &&
    profile.morning_first &&
    profile.what_helps.length > 0 &&
    profile.check_in_style,
  );
}

export { toggleExclusiveChoice };
