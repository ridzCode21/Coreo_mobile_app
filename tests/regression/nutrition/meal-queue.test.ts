/**
 * Issue #49 — pure rules of the offline meal queue: oldest-first order, no duplicate ids, a size
 * cap, what to do with each kind of send failure, and a flush that never loses or double-sends a
 * meal.
 */

import { ApiError } from '@/shared/api/errors';
import {
  MEAL_QUEUE_LIMIT,
  classifySendFailure,
  dismissRejected,
  enqueueMeals,
  flushMealQueue,
  parseMealQueue,
  pendingMeals,
  rejectedMeals,
  type QueuedEntry,
  type QueuedMeal,
} from '@/features/nutrition/lib/mealQueue';

const entry: QueuedEntry = {
  meal_type: 'lunch',
  food_name: 'Rice bowl',
  calories: 520,
  protein_g: 24,
  carbs_g: 70,
  fat_g: 14,
  source: 'manual',
};

function meal(id: string, createdAt = '2026-07-07T14:00:00.000Z') {
  return { id, createdAt, date: '2026-07-07', entry };
}

function queueOf(...ids: string[]): QueuedMeal[] {
  return enqueueMeals(
    [],
    ids.map((id) => meal(id)),
  ) as QueuedMeal[];
}

describe('nutrition: offline meal queue (issue #49)', () => {
  describe('enqueueMeals', () => {
    it('appends meals as pending, keeping the oldest first', () => {
      const queue = enqueueMeals(queueOf('a'), [meal('b'), meal('c')]);
      expect(queue?.map((item) => item.id)).toEqual(['a', 'b', 'c']);
      expect(queue?.every((item) => item.status === 'pending')).toBe(true);
    });

    it('skips a meal whose id is already queued, so a retried save is not doubled', () => {
      const queue = enqueueMeals(queueOf('a'), [meal('a'), meal('b')]);
      expect(queue?.map((item) => item.id)).toEqual(['a', 'b']);
    });

    it('refuses to grow past the cap instead of dropping a meal quietly', () => {
      const full = queueOf(...Array.from({ length: MEAL_QUEUE_LIMIT }, (_, i) => `m${i}`));
      expect(enqueueMeals(full, [meal('one-too-many')])).toBeNull();
      expect(enqueueMeals(full, [meal('m0')])).toHaveLength(MEAL_QUEUE_LIMIT);
    });
  });

  describe('parseMealQueue (what comes back from disk)', () => {
    it('keeps valid meals, drops unreadable and duplicate ones, and survives garbage', () => {
      const valid = queueOf('a', 'b');
      const parsed = parseMealQueue([...valid, { id: 'bad' }, valid[0], 'nope', null]);
      expect(parsed.map((item) => item.id)).toEqual(['a', 'b']);
      expect(parseMealQueue('not an array')).toEqual([]);
      expect(parseMealQueue(undefined)).toEqual([]);
    });

    it('rejects an entry with a wrong field type', () => {
      const broken = { ...queueOf('a')[0], entry: { ...entry, calories: 'lots' } };
      expect(parseMealQueue([broken])).toEqual([]);
    });
  });

  describe('classifySendFailure', () => {
    it('keeps the meal for later when the network, the server or the session is the problem', () => {
      expect(classifySendFailure(ApiError.network())).toBe('retry-later');
      expect(classifySendFailure(new ApiError('x', 'server', 503))).toBe('retry-later');
      expect(classifySendFailure(new ApiError('x', 'unauthorized', 401))).toBe('retry-later');
      expect(classifySendFailure(new ApiError('x', 'unknown', 429))).toBe('retry-later');
      expect(classifySendFailure(new Error('boom'))).toBe('retry-later');
    });

    it('marks the meal rejected when the server refuses the meal itself', () => {
      expect(classifySendFailure(new ApiError('x', 'validation', 422))).toBe('rejected');
      expect(classifySendFailure(new ApiError('x', 'unknown', 404))).toBe('rejected');
    });
  });

  describe('flushMealQueue', () => {
    function harness(initial: QueuedMeal[]) {
      let queue = initial;
      return {
        getQueue: () => queue,
        update: (next: QueuedMeal[]) => {
          queue = next;
        },
      };
    }

    it('sends oldest first and empties the queue', async () => {
      const state = harness(queueOf('a', 'b', 'c'));
      const sent: string[] = [];
      const result = await flushMealQueue({
        ...state,
        send: async (item) => {
          sent.push(item.id);
        },
      });
      expect(sent).toEqual(['a', 'b', 'c']);
      expect(result).toEqual({ sent: 3, rejected: 0, stoppedEarly: false });
      expect(state.getQueue()).toEqual([]);
    });

    it('stops at a temporary failure and keeps that meal and the ones after it, in order', async () => {
      const state = harness(queueOf('a', 'b', 'c'));
      const result = await flushMealQueue({
        ...state,
        send: async (item) => {
          if (item.id === 'b') throw ApiError.network();
        },
      });
      expect(result).toEqual({ sent: 1, rejected: 0, stoppedEarly: true });
      expect(state.getQueue().map((item) => item.id)).toEqual(['b', 'c']);
    });

    it('keeps a rejected meal (marked, not lost) and carries on with the rest', async () => {
      const state = harness(queueOf('a', 'b', 'c'));
      const result = await flushMealQueue({
        ...state,
        send: async (item) => {
          if (item.id === 'b') throw new ApiError('bad', 'validation', 422);
        },
      });
      expect(result).toEqual({ sent: 2, rejected: 1, stoppedEarly: false });
      expect(rejectedMeals(state.getQueue()).map((item) => item.id)).toEqual(['b']);
      expect(pendingMeals(state.getQueue())).toEqual([]);
    });

    it('does not resend a rejected meal on the next flush', async () => {
      const state = harness(queueOf('a'));
      await flushMealQueue({
        ...state,
        send: async () => {
          throw new ApiError('bad', 'validation', 422);
        },
      });
      const send = jest.fn();
      await flushMealQueue({ ...state, send });
      expect(send).not.toHaveBeenCalled();
    });

    it('picks up a meal queued while a send is in flight', async () => {
      const state = harness(queueOf('a'));
      const sent: string[] = [];
      await flushMealQueue({
        ...state,
        send: async (item) => {
          sent.push(item.id);
          if (item.id === 'a') {
            state.update(enqueueMeals(state.getQueue(), [meal('late')]) as QueuedMeal[]);
          }
        },
      });
      expect(sent).toEqual(['a', 'late']);
      expect(state.getQueue()).toEqual([]);
    });
  });

  it('dismissRejected removes only rejected meals', () => {
    const queue: QueuedMeal[] = [{ ...queueOf('a')[0], status: 'rejected' }, queueOf('b')[0]];
    expect(dismissRejected(queue).map((item) => item.id)).toEqual(['b']);
  });
});
