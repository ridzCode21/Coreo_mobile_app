import { z } from 'zod';

export const rightNowBreathSchema = z
  .object({
    eyebrow: z.string(),
    headline: z.string(),
    cue: z.string(),
    pattern: z.string(),
    line: z.string(),
    not_now: z.string(),
    im_here: z.string(),
    heart_rate: z.number().optional(),
  })
  .strict();

export const rightNowResponseSchema = z
  .object({
    breath: rightNowBreathSchema.nullable(),
    message: z.string().optional(),
  })
  .strict();

export type RightNowBreath = z.infer<typeof rightNowBreathSchema>;
export type RightNowResponse = z.infer<typeof rightNowResponseSchema>;
