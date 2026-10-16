import { z } from 'zod';

export const FITNESS_GOALS = [
  'get_stronger',
  'build_muscle',
  'lose_fat_keep_muscle',
  'move_better',
  'race_or_event',
] as const;

export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export const TRAINING_PLACES = [
  'full_gym',
  'home_dumbbells_band',
  'bodyweight',
  'outdoors',
] as const;

export type TrainingPlace = (typeof TRAINING_PLACES)[number];

export const SPORTS = [
  'cricket',
  'football',
  'badminton',
  'running',
  'swimming',
  'nothing_regular',
] as const;

export type Sport = (typeof SPORTS)[number];

export const PROTECTED_AREAS = [
  'lower_back',
  'knees',
  'shoulders',
  'wrists',
  'nothing_to_flag',
] as const;

export type ProtectedArea = (typeof PROTECTED_AREAS)[number];

const fitnessGoalSchema = z.enum(FITNESS_GOALS);
const trainingPlaceSchema = z.enum(TRAINING_PLACES);
const sportSchema = z.enum(SPORTS);
const protectedAreaSchema = z.enum(PROTECTED_AREAS);

export const fitnessProfileSchema = z
  .object({
    fitness_interview_complete: z.boolean(),
    fitness_goal: z.union([fitnessGoalSchema, z.literal('')]),
    training_places: z.array(trainingPlaceSchema),
    movement_note: z.string().max(2000),
    sports: z.array(sportSchema),
    protected_areas: z.array(protectedAreaSchema),
  })
  .strict();

const uniqueChoiceList = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .array(itemSchema)
    .min(1)
    .refine((items) => new Set(items).size === items.length);

export const fitnessProfilePatchSchema = z
  .object({
    fitness_goal: z.union([fitnessGoalSchema, z.literal('')]).optional(),
    training_places: uniqueChoiceList(trainingPlaceSchema).optional(),
    movement_note: z.string().trim().max(2000).optional(),
    sports: uniqueChoiceList(sportSchema)
      .refine((items) => !items.includes('nothing_regular') || items.length === 1)
      .optional(),
    protected_areas: uniqueChoiceList(protectedAreaSchema)
      .refine((items) => !items.includes('nothing_to_flag') || items.length === 1)
      .optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0);

export type FitnessProfile = z.infer<typeof fitnessProfileSchema>;

export type FitnessProfilePatch = z.infer<typeof fitnessProfilePatchSchema>;

type FitnessCompletionFields = Pick<
  FitnessProfile,
  'fitness_goal' | 'training_places' | 'sports' | 'protected_areas'
>;

export function computeFitnessInterviewComplete(profile: FitnessCompletionFields): boolean {
  return Boolean(
    profile.fitness_goal &&
    profile.training_places.length > 0 &&
    profile.sports.length > 0 &&
    profile.protected_areas.length > 0,
  );
}

export function toggleExclusiveChoice(
  current: string[],
  value: string,
  aloneValue: string,
): string[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (value === aloneValue) return [aloneValue];
  return [...current.filter((item) => item !== aloneValue), value];
}
