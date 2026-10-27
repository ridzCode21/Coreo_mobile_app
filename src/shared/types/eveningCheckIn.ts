import { z } from 'zod';

/**
 * Shapes of GET/POST `/users/me/evening-check-in/` (backend `apps/users/services/evening_check_in.py`).
 * Parsed non-strict on purpose: a field the backend adds later is dropped, not a broken screen.
 */

export const eveningCheckInMoodKeySchema = z.enum(['rough', 'meh', 'okay', 'good', 'great']);

export const eveningCheckInMoodOptionSchema = z.object({
  key: eveningCheckInMoodKeySchema,
  label: z.string(),
});

export const eveningCheckInPreviewSchema = z.object({
  eyebrow: z.string(),
  line: z.string(),
  action: z.string(),
});

export const eveningCheckInRitualSchema = z.object({
  eyebrow: z.string(),
  question: z.string(),
  moods: z.array(eveningCheckInMoodOptionSchema),
  looks_right_label: z.string(),
  fix_label: z.string(),
  recap: z.array(z.string()),
  note_prompt: z.string(),
  close_label: z.string(),
  closed: z.boolean(),
  preview: eveningCheckInPreviewSchema.nullable().optional(),
  message: z.string().nullable().optional(),
});

export const eveningCheckInCloseResponseSchema = z.object({
  check_in: z.object({
    local_date: z.string(),
    mood: eveningCheckInMoodKeySchema,
    closed: z.literal(true),
  }),
  preview: eveningCheckInPreviewSchema.nullable(),
  message: z.string().nullable().optional(),
});

export type EveningCheckInMoodKey = z.infer<typeof eveningCheckInMoodKeySchema>;
export type EveningCheckInMoodOption = z.infer<typeof eveningCheckInMoodOptionSchema>;
export type EveningCheckInPreview = z.infer<typeof eveningCheckInPreviewSchema>;
export type EveningCheckInRitual = z.infer<typeof eveningCheckInRitualSchema>;
export type EveningCheckInCloseResponse = z.infer<typeof eveningCheckInCloseResponseSchema>;
