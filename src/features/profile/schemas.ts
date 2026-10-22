import { z } from 'zod';

/** Mirrors PATCH /users/me/memory-facts/{fact_id}/ after the backend trims the value. */
export const memoryFactCorrectionSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export type MemoryFactCorrectionValues = z.infer<typeof memoryFactCorrectionSchema>;
