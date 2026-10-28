/**
 * Pure rules for the lock-screen check-in nudge (screen 27c, issue #47). No Expo, storage or
 * network in this file, so every rule is unit tested.
 *
 * The server (`apps/users/services/push.py`, `ExpoPushBackend`) sends `categoryId: <kind>` and
 * puts the notice in `data`: `{ id, kind, title, body, time, actions, due_at, device_token_id }`.
 * Only `evening_check_in` carries Good and Rough; `POST .../answer/` accepts `good` or `rough`
 * and nothing else (`open` is a 400), so "Open" and a tap on the banner never send an answer.
 */

import { z } from 'zod';

/** Category id the server sends for the 9:00 PM nudge (`CheckInNotice.Kind.EVENING_CHECK_IN`). */
export const EVENING_CHECK_IN_CATEGORY = 'evening_check_in';

/** Button identifiers; they match the `key` of each action the server lists on the notice. */
export const ACTION_GOOD = 'good';
export const ACTION_ROUGH = 'rough';
export const ACTION_OPEN = 'open';

export const checkInAnswerSchema = z.enum(['good', 'rough']);
export type CheckInAnswer = z.infer<typeof checkInAnswerSchema>;

/** Buttons exactly as drawn on design 27c: Good, Rough, Open. */
export const EVENING_CHECK_IN_ACTIONS = [
  { identifier: ACTION_GOOD, buttonTitle: 'Good', opensAppToForeground: false },
  { identifier: ACTION_ROUGH, buttonTitle: 'Rough', opensAppToForeground: false },
  { identifier: ACTION_OPEN, buttonTitle: 'Open', opensAppToForeground: true },
] as const;

/** The notice payload the server puts in the push `data`. Only what the app reads is required. */
export const noticePayloadSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
});

export type NoticeResponseInput = {
  actionIdentifier: string;
  /** `request.content.data` of the notification the person acted on. */
  data: unknown;
  /** Stable key for one tap (notification id + action), used to ignore a repeated delivery. */
  responseKey: string;
};

export type NoticeResponseDecision =
  /** Good or Rough tapped on an evening check-in with a usable notice id: send this answer. */
  | { type: 'answer'; noticeId: string; answer: CheckInAnswer; responseKey: string }
  /** Good or Rough tapped but the notice id is missing or unreadable: nothing can be sent. */
  | { type: 'unreadable' }
  /** Open, a tap on the banner, or any other notification: just opens the app. */
  | { type: 'open' };

/** Maps a button to the answer the server accepts. Anything else is not an answer. */
export function answerForAction(actionIdentifier: string): CheckInAnswer | null {
  const parsed = checkInAnswerSchema.safeParse(actionIdentifier);
  return parsed.success ? parsed.data : null;
}

export function decideNoticeResponse(input: NoticeResponseInput): NoticeResponseDecision {
  const answer = answerForAction(input.actionIdentifier);
  if (!answer) return { type: 'open' };

  const payload = noticePayloadSchema.safeParse(input.data);
  if (!payload.success) return { type: 'unreadable' };
  // A late-night guard notice has no Good or Rough; the server would refuse it (`action_invalid`).
  if (payload.data.kind !== EVENING_CHECK_IN_CATEGORY) return { type: 'open' };
  return { type: 'answer', noticeId: payload.data.id, answer, responseKey: input.responseKey };
}

/** True when the notification's data says it is the evening check-in notice (not the late-night one). */
export function isEveningCheckInNotice(data: unknown): boolean {
  const payload = noticePayloadSchema.safeParse(data);
  return payload.success && payload.data.kind === EVENING_CHECK_IN_CATEGORY;
}
