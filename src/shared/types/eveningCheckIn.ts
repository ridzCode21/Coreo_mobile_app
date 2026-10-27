import { z } from 'zod';

export const eveningCheckInMoodKeySchema = z.enum(['rough', 'meh', 'okay', 'good', 'great']);

export const eveningCheckInMoodOptionSchema = z
  .object({ key: eveningCheckInMoodKeySchema, label: z.string() })
  .strict();

export const eveningCheckInPreviewSchema = z
  .object({ eyebrow: z.string(), line: z.string(), action: z.string() })
  .strict();

export const eveningCheckInRitualSchema = z
  .object({
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
  })
  .strict();

export const eveningCheckInCloseResponseSchema = z
  .object({
    check_in: z
      .object({
        local_date: z.string(),
        mood: eveningCheckInMoodKeySchema,
        closed: z.literal(true),
      })
      .strict(),
    preview: eveningCheckInPreviewSchema.nullable(),
    message: z.string().nullable().optional(),
  })
  .strict();

export type EveningCheckInMoodKey = z.infer<typeof eveningCheckInMoodKeySchema>;
export type EveningCheckInMoodOption = z.infer<typeof eveningCheckInMoodOptionSchema>;
export type EveningCheckInPreview = z.infer<typeof eveningCheckInPreviewSchema>;
export type EveningCheckInRitual = z.infer<typeof eveningCheckInRitualSchema>;
export type EveningCheckInCloseResponse = z.infer<typeof eveningCheckInCloseResponseSchema>;
