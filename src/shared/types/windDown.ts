import { z } from 'zod';

export const windDownStepSchema = z
  .object({
    time: z.string(),
    text: z.string(),
    reason: z.string(),
  })
  .strict();

export const windDownSchema = z
  .object({
    clock: z.string(),
    headline: z.string(),
    title: z.string(),
    lights_out: z.string(),
    steps: z.array(windDownStepSchema),
    line: z.string(),
    reason: z.string(),
    plain_words: z.string().optional(),
    pushed: z.boolean(),
  })
  .strict();

export const windDownResponseSchema = z.object({ wind_down: windDownSchema.nullable() }).strict();

export type WindDownStep = z.infer<typeof windDownStepSchema>;
export type WindDown = z.infer<typeof windDownSchema>;
export type WindDownResponse = z.infer<typeof windDownResponseSchema>;
