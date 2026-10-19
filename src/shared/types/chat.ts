import { z } from 'zod';

export const chatReceiptSchema = z
  .object({
    pillar: z.enum(['fitness', 'diet', 'wellness']),
    kind: z.enum(['changed', 'suggested', 'moved_up']),
    label: z.string(),
    summary: z.string(),
    detail: z.string(),
  })
  .strict();

export const chatProposeResponseSchema = z
  .object({
    listening: z.string(),
    heard: z.string(),
    line: z.string().nullable(),
    receipts: z.array(chatReceiptSchema),
    hint: z.string(),
    proposal_id: z.string().nullable(),
    requires_confirmation: z.boolean(),
  })
  .strict();

export const chatConfirmResponseSchema = z
  .object({
    proposal_id: z.string(),
    applied: z.literal(true),
    receipts: z.array(chatReceiptSchema),
  })
  .strict();

export const chatUndoResponseSchema = z
  .object({
    proposal_id: z.string(),
    undone: z.literal(true),
    receipts: z.array(chatReceiptSchema),
  })
  .strict();

export type ChatReceipt = z.infer<typeof chatReceiptSchema>;
export type ChatProposeResponse = z.infer<typeof chatProposeResponseSchema>;
export type ChatConfirmResponse = z.infer<typeof chatConfirmResponseSchema>;
export type ChatUndoResponse = z.infer<typeof chatUndoResponseSchema>;
