/**
 * Pure rules for the offline meal queue (issue #49): meals logged with no connection wait here and
 * are sent, oldest first, when the connection returns. No storage and no network in this file, so
 * every rule is unit tested. Persistence is `mealQueueStorage.ts`; the live queue is
 * `store/mealQueueStore.ts`.
 *
 * Privacy: queue entries are food data written to the phone's unencrypted storage, so each one
 * holds only the fields `POST /food/entries/` needs plus a local id/time. Never add tokens or
 * profile data here.
 */

import { z } from 'zod';

import { ApiError } from '@/shared/api/errors';

/** Upper bound on saved entries so a long offline stretch cannot grow the stored data forever. */
export const MEAL_QUEUE_LIMIT = 50;

const aiGuessSchema = z.object({
  name: z.string(),
  portion_grams: z.number().nullable(),
  est_calories: z.number(),
  est_protein_g: z.number(),
  est_carbs_g: z.number(),
  est_fat_g: z.number(),
  confidence: z.number(),
});

export const queuedEntrySchema = z.object({
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_name: z.string(),
  portion_g: z.number().nullable().optional(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  source: z.enum(['photo', 'barcode', 'manual', 'import', 'quick_add', 'label_ocr']),
  ai_guess: aiGuessSchema.optional(),
});
export type QueuedEntry = z.infer<typeof queuedEntrySchema>;

export const queuedMealSchema = z.object({
  /** Local id, unique per logged item: the same id is never queued or sent twice. */
  id: z.string().min(1),
  createdAt: z.string(),
  /** `YYYY-MM-DD` the meal belongs to (the day it was logged, not the day it is sent). */
  date: z.string(),
  entry: queuedEntrySchema,
  /** `rejected`: the server refused it. Kept (never silently dropped) until the user dismisses it. */
  status: z.enum(['pending', 'rejected']),
});
export type QueuedMeal = z.infer<typeof queuedMealSchema>;

/** Reads whatever came back from disk, keeping the valid entries and dropping unreadable ones. */
export function parseMealQueue(raw: unknown): QueuedMeal[] {
  if (!Array.isArray(raw)) return [];
  const meals: QueuedMeal[] = [];
  for (const item of raw) {
    const parsed = queuedMealSchema.safeParse(item);
    if (parsed.success && !meals.some((meal) => meal.id === parsed.data.id)) {
      meals.push(parsed.data);
    }
  }
  return meals.slice(0, MEAL_QUEUE_LIMIT);
}

type NewQueuedMeal = Pick<QueuedMeal, 'id' | 'createdAt' | 'date' | 'entry'>;

/**
 * Adds meals to the end of the queue (oldest stay first). A meal whose id is already queued is
 * skipped, so retrying the same save never doubles it. Returns `null` when the queue is full, so
 * the caller can show the normal save error instead of losing the meal quietly.
 */
export function enqueueMeals(queue: QueuedMeal[], meals: NewQueuedMeal[]): QueuedMeal[] | null {
  const fresh = meals.filter((meal) => !queue.some((queued) => queued.id === meal.id));
  if (queue.length + fresh.length > MEAL_QUEUE_LIMIT) return null;
  return [...queue, ...fresh.map((meal): QueuedMeal => ({ ...meal, status: 'pending' }))];
}

export function pendingMeals(queue: QueuedMeal[]): QueuedMeal[] {
  return queue.filter((meal) => meal.status === 'pending');
}

export function rejectedMeals(queue: QueuedMeal[]): QueuedMeal[] {
  return queue.filter((meal) => meal.status === 'rejected');
}

export function removeMeal(queue: QueuedMeal[], id: string): QueuedMeal[] {
  return queue.filter((meal) => meal.id !== id);
}

export function markRejected(queue: QueuedMeal[], id: string): QueuedMeal[] {
  return queue.map((meal): QueuedMeal => (meal.id === id ? { ...meal, status: 'rejected' } : meal));
}

export function dismissRejected(queue: QueuedMeal[]): QueuedMeal[] {
  return pendingMeals(queue);
}

export type SendFailure = 'retry-later' | 'rejected';

/**
 * Decides what a failed send means. A refusal about the meal itself (400/422 and other client
 * errors) will never succeed on retry, so it is marked rejected. Everything else (no network,
 * server trouble, an expired session, rate limiting) is temporary: keep the meal, stop, and try
 * again at the next reconnect.
 */
export function classifySendFailure(error: unknown): SendFailure {
  if (!(error instanceof ApiError)) return 'retry-later';
  if (error.kind === 'validation') return 'rejected';
  if (error.kind === 'unknown' && error.status !== undefined) {
    const temporary = error.status === 408 || error.status === 429;
    return temporary ? 'retry-later' : 'rejected';
  }
  return 'retry-later';
}

export type FlushResult = { sent: number; rejected: number; stoppedEarly: boolean };

type FlushOptions = {
  /** Always read the queue fresh: meals may be added while a send is in flight. */
  getQueue: () => QueuedMeal[];
  update: (next: QueuedMeal[]) => void | Promise<void>;
  send: (meal: QueuedMeal) => Promise<unknown>;
};

/**
 * Sends pending meals oldest-first, one at a time. A sent meal is removed right away (so a crash
 * mid-flush cannot resend it); a rejected one is marked and skipped; a temporary failure stops the
 * run so order is kept and the rest wait for the next reconnect.
 */
export async function flushMealQueue({
  getQueue,
  update,
  send,
}: FlushOptions): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, rejected: 0, stoppedEarly: false };
  for (;;) {
    const next = pendingMeals(getQueue())[0];
    if (!next) return result;
    try {
      await send(next);
      await update(removeMeal(getQueue(), next.id));
      result.sent += 1;
    } catch (error) {
      if (classifySendFailure(error) === 'rejected') {
        await update(markRejected(getQueue(), next.id));
        result.rejected += 1;
      } else {
        result.stoppedEarly = true;
        return result;
      }
    }
  }
}

/** Local-only id for a queued meal. It never leaves the phone, so it needs no strong randomness. */
export function newMealId(now: Date = new Date()): string {
  return `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
