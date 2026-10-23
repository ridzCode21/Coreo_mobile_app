/**
 * Pure rules for answers that could not be sent yet (issue #47): Good or Rough tapped on the lock
 * screen while the phone had no connection. They wait here, oldest first, and are sent when the
 * app next runs online. Last tap per notice wins, matching the server ("answering again
 * overwrites"). No storage or network in this file.
 *
 * Privacy: an entry is a notice id plus `good` or `rough`, written to unencrypted app storage.
 * Never add tokens or profile data here. Removed at logout.
 */

import { z } from 'zod';

import { ApiError } from '@/shared/api/errors';
import {
  checkInAnswerSchema,
  type CheckInAnswer,
} from '@/features/notifications/lib/checkInNotice';

/** The server sends one nudge per device per day, so a small cap keeps stored data bounded. */
export const PENDING_ANSWER_LIMIT = 20;

export const pendingAnswerSchema = z.object({
  noticeId: z.string().uuid(),
  answer: checkInAnswerSchema,
  createdAt: z.string(),
});
export type PendingAnswer = z.infer<typeof pendingAnswerSchema>;

export function newPendingAnswer(
  noticeId: string,
  answer: CheckInAnswer,
  now: Date,
): PendingAnswer {
  return { noticeId, answer, createdAt: now.toISOString() };
}

export function addPendingAnswer(queue: PendingAnswer[], next: PendingAnswer): PendingAnswer[] {
  const rest = queue.filter((item) => item.noticeId !== next.noticeId);
  return [...rest, next].slice(-PENDING_ANSWER_LIMIT);
}

export function removePendingAnswer(queue: PendingAnswer[], noticeId: string): PendingAnswer[] {
  return queue.filter((item) => item.noticeId !== noticeId);
}

/** Reads whatever came back from disk, keeping the valid entries and dropping unreadable ones. */
export function parsePendingAnswers(raw: unknown): PendingAnswer[] {
  if (!Array.isArray(raw)) return [];
  let queue: PendingAnswer[] = [];
  for (const item of raw) {
    const parsed = pendingAnswerSchema.safeParse(item);
    if (parsed.success) queue = addPendingAnswer(queue, parsed.data);
  }
  return queue;
}

/**
 * What to do when sending an answer failed. Only "could not reach the server" and server faults
 * are worth another try; a refusal (unknown notice, bad value) or an expired session will not
 * change by waiting, so the answer is dropped rather than retried forever.
 */
export function shouldRetryAnswer(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.kind === 'network' || error.kind === 'server';
}
