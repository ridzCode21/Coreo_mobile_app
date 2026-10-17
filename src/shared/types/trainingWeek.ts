import { z } from 'zod';

export const trainingWeekExerciseSchema = z.object({
  key: z.string(),
  name: z.string(),
  sets: z.number().int(),
  reps: z.number().int(),
  weight_kg: z.number().nullable(),
  superset: z.string().nullable(),
  completed_sets: z.array(z.number().int()),
});

export const trainingWeekSessionSchema = z.object({
  key: z.string(),
  name: z.string(),
  weekday: z.string(),
  date: z.string(),
  status: z.enum(['done', 'today', 'upcoming', 'past']),
  duration_min: z.number().int().nullable(),
  gear: z.string().nullable(),
  movement_count: z.number().int(),
  note: z.string().nullable(),
  progression_note: z.string().nullable(),
  lighter_note: z.string().nullable(),
  exercises: z.array(trainingWeekExerciseSchema),
});

export const trainingWeekPositionSchema = z.object({
  week: z.number().int(),
  day: z.number().int().min(1).max(7),
  label: z.string(),
});

export const trainingWeekSchema = z.object({
  position: trainingWeekPositionSchema,
  status: z.enum(['complete', 'in_progress']),
  summary: z.string(),
  sessions: z.array(trainingWeekSessionSchema),
  today: trainingWeekSessionSchema.nullable(),
});

export const trainingWeekResponseSchema = z.object({
  training_week: trainingWeekSchema.nullable(),
});

export const markSetRequestSchema = z.object({
  session_key: z.string(),
  exercise_key: z.string(),
  set_number: z.number().int(),
});

export type TrainingWeekExercise = z.infer<typeof trainingWeekExerciseSchema>;
export type TrainingWeekSession = z.infer<typeof trainingWeekSessionSchema>;
export type TrainingWeek = z.infer<typeof trainingWeekSchema>;
export type TrainingWeekResponse = z.infer<typeof trainingWeekResponseSchema>;
export type MarkSetRequest = z.infer<typeof markSetRequestSchema>;
