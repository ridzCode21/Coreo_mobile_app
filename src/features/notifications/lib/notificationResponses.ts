/**
 * Turns a tap on the lock-screen nudge into an answer (issue #47, design 27c). Good and Rough send
 * `POST /users/me/check-in-notices/{id}/answer/` without opening the app; Open and a tap on the
 * banner only open it and send nothing.
 *
 * Library limits (SDK 57 docs): when the app is killed, a button that does not open the app is not
 * delivered to JavaScript listeners on iOS, and on Android only a task from `expo-task-manager`
 * (not installed: not an approved dependency) can run it. So the answer is picked up by whichever
 * of these runs first: the live listener, the last-response check at start, or at the next time
 * the app comes to the front. A repeated delivery of the same tap is ignored.
 */
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { answerCheckInNoticeWith } from '@/features/notifications/api/checkInNoticeApi';
import {
  flushAnswers,
  submitAnswer,
  type AnswerQueueDeps,
} from '@/features/notifications/lib/answerQueue';
import { decideNoticeResponse } from '@/features/notifications/lib/checkInNotice';
import {
  readPendingAnswers,
  writePendingAnswers,
} from '@/features/notifications/lib/pendingAnswersStorage';
import { queryClient } from '@/shared/api/queryClient';

const handledResponses = new Set<string>();

export const answerQueueDeps: AnswerQueueDeps = {
  send: (noticeId, answer) => answerCheckInNoticeWith(queryClient, { noticeId, answer }),
  read: readPendingAnswers,
  write: writePendingAnswers,
  now: () => new Date(),
};

function responseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

/** Handles one response. Returns what happened, for tests; never throws. */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<'answered' | 'open' | 'ignored'> {
  const key = responseKey(response);
  if (handledResponses.has(key)) return 'ignored';
  handledResponses.add(key);

  const decision = decideNoticeResponse({
    actionIdentifier: response.actionIdentifier,
    data: response.notification.request.content.data,
    responseKey: key,
  });
  if (decision.type === 'unreadable') return 'ignored'; // no notice id: nothing the server could accept
  if (decision.type === 'open') return 'open';

  try {
    await submitAnswer(answerQueueDeps, decision.noticeId, decision.answer);
  } catch {
    // Saving to disk failed: nothing more can be done from a background tap, and nothing is shown.
  }
  return 'answered';
}

async function checkLastResponse(): Promise<void> {
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      await handleNotificationResponse(last);
      await Notifications.clearLastNotificationResponseAsync();
    }
  } catch {
    // The last response is a convenience for cold starts; the live listener still works.
  }
}

/** Sends any answers kept from an earlier failed send. Safe to call often. */
export async function flushPendingAnswers(): Promise<void> {
  try {
    await flushAnswers(answerQueueDeps);
  } catch {
    // Kept on disk; the next start or reconnect tries again.
  }
}

/**
 * Starts listening for taps. Call once at module scope of an early-loaded file so a launch caused
 * by the notification is caught. Returns a function that stops listening.
 */
export function startNotificationResponseHandling(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    void handleNotificationResponse(response);
  });
  void checkLastResponse();
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void checkLastResponse();
  });
  return () => {
    subscription.remove();
    appState.remove();
  };
}

/** Test helper: forget which taps were handled. */
export function __resetHandledResponsesForTests(): void {
  handledResponses.clear();
}
