import { z } from 'zod';

/** Mirrors PATCH /users/me/memory-facts/{fact_id}/ after the backend trims the value. */
export const memoryFactCorrectionSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export type MemoryFactCorrectionValues = z.infer<typeof memoryFactCorrectionSchema>;

export const accountNameSchema = z.object({
  first_name: z.string().trim().min(1, "Your name can't be empty."),
  last_name: z.string().trim(),
});

export type AccountNameFormValues = z.infer<typeof accountNameSchema>;
