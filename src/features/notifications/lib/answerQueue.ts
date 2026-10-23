/**
 * Sends a lock-screen answer, or keeps it for later (issue #47). The send and the saved list are
 * passed in, so the rules (queue on a dropped connection, drop a refusal, never send twice at the
 * same time, keep order) are tested without a network or a disk.
 */
import type { CheckInAnswer } from '@/features/notifications/lib/checkInNotice';
import {
  addPendingAnswer,
  newPendingAnswer,
  removePendingAnswer,
  shouldRetryAnswer,
  type PendingAnswer,
} from '@/features/notifications/lib/pendingAnswers';

export type AnswerQueueDeps = {
  send: (noticeId: string, answer: CheckInAnswer) => Promise<unknown>;
  read: () => Promise<PendingAnswer[]>;
  write: (queue: PendingAnswer[]) => Promise<void>;
  now: () => Date;
};

export type SubmitResult = 'sent' | 'queued' | 'dropped';

/** One at a time: a tap and a reconnect flush can never send the same answer twice. */
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

async function queue(deps: AnswerQueueDeps, noticeId: string, answer: CheckInAnswer) {
  const saved = await deps.read();
  await deps.write(addPendingAnswer(saved, newPendingAnswer(noticeId, answer, deps.now())));
}

/** Tries to send now. Network or server trouble keeps the answer; a refusal drops it. */
export function submitAnswer(
  deps: AnswerQueueDeps,
  noticeId: string,
  answer: CheckInAnswer,
): Promise<SubmitResult> {
  return serialize(async () => {
    try {
      await deps.send(noticeId, answer);
    } catch (error) {
      if (!shouldRetryAnswer(error)) return 'dropped';
      await queue(deps, noticeId, answer);
      return 'queued';
    }
    // A newer saved tap for this notice (from an earlier failed send) is now out of date.
    const saved = await deps.read();
    if (saved.some((item) => item.noticeId === noticeId)) {
      await deps.write(removePendingAnswer(saved, noticeId));
    }
    return 'sent';
  });
}

/** Sends the saved answers oldest first. Stops at the first connection failure; keeps the rest. */
export function flushAnswers(deps: AnswerQueueDeps): Promise<number> {
  return serialize(async () => {
    let sent = 0;
    for (const item of await deps.read()) {
      try {
        await deps.send(item.noticeId, item.answer);
      } catch (error) {
        if (shouldRetryAnswer(error)) break;
      }
      await deps.write(removePendingAnswer(await deps.read(), item.noticeId));
      sent += 1;
    }
    return sent;
  });
}
