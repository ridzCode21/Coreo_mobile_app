/**
 * Issue #47 — a Good or Rough tap with no connection is kept and sent later; a refusal is dropped;
 * the same answer is never sent twice; disk data is validated on read.
 */

import { ApiError } from '@/shared/api/errors';
import {
  addPendingAnswer,
  newPendingAnswer,
  parsePendingAnswers,
  PENDING_ANSWER_LIMIT,
  removePendingAnswer,
  shouldRetryAnswer,
  type PendingAnswer,
} from '@/features/notifications/lib/pendingAnswers';
import {
  flushAnswers,
  submitAnswer,
  type AnswerQueueDeps,
} from '@/features/notifications/lib/answerQueue';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-07-07T21:00:00.000Z');

function makeDeps(send: AnswerQueueDeps['send']) {
  let disk: PendingAnswer[] = [];
  const deps: AnswerQueueDeps = {
    send,
    read: jest.fn(async () => disk),
    write: jest.fn(async (queue) => {
      disk = queue;
    }),
    now: () => NOW,
  };
  return { deps, disk: () => disk, seed: (queue: PendingAnswer[]) => (disk = queue) };
}

describe('pending answers: pure rules', () => {
  it('keeps the last tap per notice, in order', () => {
    let queue: PendingAnswer[] = [];
    queue = addPendingAnswer(queue, newPendingAnswer(A, 'good', NOW));
    queue = addPendingAnswer(queue, newPendingAnswer(B, 'rough', NOW));
    queue = addPendingAnswer(queue, newPendingAnswer(A, 'rough', NOW));
    expect(queue.map((item) => [item.noticeId, item.answer])).toEqual([
      [B, 'rough'],
      [A, 'rough'],
    ]);
    expect(removePendingAnswer(queue, B).map((item) => item.noticeId)).toEqual([A]);
  });

  it('caps the saved list', () => {
    let queue: PendingAnswer[] = [];
    for (let index = 0; index < PENDING_ANSWER_LIMIT + 5; index += 1) {
      const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      queue = addPendingAnswer(queue, newPendingAnswer(id, 'good', NOW));
    }
    expect(queue).toHaveLength(PENDING_ANSWER_LIMIT);
  });

  it('keeps valid disk entries and drops unreadable ones, including a value of open', () => {
    const parsed = parsePendingAnswers([
      { noticeId: A, answer: 'good', createdAt: 'x' },
      { noticeId: B, answer: 'open', createdAt: 'x' },
      { noticeId: 'nope', answer: 'good', createdAt: 'x' },
      'junk',
    ]);
    expect(parsed.map((item) => item.noticeId)).toEqual([A]);
    expect(parsePendingAnswers('not a list')).toEqual([]);
    expect(parsePendingAnswers(null)).toEqual([]);
  });

  it('retries only a dropped connection or a server fault', () => {
    expect(shouldRetryAnswer(ApiError.network())).toBe(true);
    expect(shouldRetryAnswer(ApiError.fromResponse(503, {}))).toBe(true);
    expect(shouldRetryAnswer(ApiError.fromResponse(404, { error: 'notice_not_found' }))).toBe(
      false,
    );
    expect(shouldRetryAnswer(ApiError.fromResponse(400, { error: 'action_invalid' }))).toBe(false);
    expect(shouldRetryAnswer(ApiError.fromResponse(401, {}))).toBe(false);
  });
});

describe('answer queue: submit and flush', () => {
  it('sends straight away and saves nothing', async () => {
    const send = jest.fn().mockResolvedValue({});
    const { deps, disk } = makeDeps(send);
    await expect(submitAnswer(deps, A, 'good')).resolves.toBe('sent');
    expect(send).toHaveBeenCalledWith(A, 'good');
    expect(disk()).toEqual([]);
  });

  it('keeps the answer when the network is down', async () => {
    const { deps, disk } = makeDeps(jest.fn().mockRejectedValue(ApiError.network()));
    await expect(submitAnswer(deps, A, 'rough')).resolves.toBe('queued');
    expect(disk()).toEqual([{ noticeId: A, answer: 'rough', createdAt: NOW.toISOString() }]);
  });

  it('drops the answer when the notice is unknown (404)', async () => {
    const { deps, disk } = makeDeps(
      jest.fn().mockRejectedValue(ApiError.fromResponse(404, { error: 'notice_not_found' })),
    );
    await expect(submitAnswer(deps, A, 'good')).resolves.toBe('dropped');
    expect(disk()).toEqual([]);
  });

  it('flush sends kept answers oldest first and empties the list', async () => {
    const send = jest.fn().mockResolvedValue({});
    const { deps, disk, seed } = makeDeps(send);
    seed([newPendingAnswer(A, 'good', NOW), newPendingAnswer(B, 'rough', NOW)]);
    await expect(flushAnswers(deps)).resolves.toBe(2);
    expect(send.mock.calls).toEqual([
      [A, 'good'],
      [B, 'rough'],
    ]);
    expect(disk()).toEqual([]);
  });

  it('flush stops at a connection failure and keeps the rest', async () => {
    const send = jest.fn().mockRejectedValue(ApiError.network());
    const { deps, disk, seed } = makeDeps(send);
    seed([newPendingAnswer(A, 'good', NOW), newPendingAnswer(B, 'rough', NOW)]);
    await expect(flushAnswers(deps)).resolves.toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(disk().map((item) => item.noticeId)).toEqual([A, B]);
  });

  it('flush drops a refused answer but still sends the next one', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(ApiError.fromResponse(404, { error: 'notice_not_found' }))
      .mockResolvedValueOnce({});
    const { deps, disk, seed } = makeDeps(send);
    seed([newPendingAnswer(A, 'good', NOW), newPendingAnswer(B, 'rough', NOW)]);
    await flushAnswers(deps);
    expect(send).toHaveBeenCalledTimes(2);
    expect(disk()).toEqual([]);
  });

  it('two flushes at once send each answer once', async () => {
    let resolveSend: () => void = () => undefined;
    const send = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    const { deps, seed } = makeDeps(send);
    seed([newPendingAnswer(A, 'good', NOW)]);
    const first = flushAnswers(deps);
    const second = flushAnswers(deps);
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveSend();
    await Promise.all([first, second]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
