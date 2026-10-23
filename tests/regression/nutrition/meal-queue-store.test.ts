/**
 * Issue #49 — the meal queue keeps working across app restarts (saved to disk, read back with Zod),
 * never sends twice when two reconnects overlap, and is wiped at logout.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/shared/api/errors';
import { STORAGE_KEYS } from '@/shared/lib/storage';
import {
  rejectedMeals,
  type QueuedEntry,
  type QueuedMeal,
} from '@/features/nutrition/lib/mealQueue';
import { useMealQueueStore } from '@/features/nutrition/store/mealQueueStore';

const entry: QueuedEntry = {
  meal_type: 'dinner',
  food_name: 'Dal',
  calories: 300,
  protein_g: 15,
  carbs_g: 40,
  fat_g: 8,
  source: 'manual',
};

const queued = (id: string) => ({
  id,
  createdAt: '2026-07-07T15:00:00.000Z',
  date: '2026-07-07',
  entry,
});

/** Simulates closing and reopening the app: memory is wiped, disk stays. */
function restartApp() {
  useMealQueueStore.setState({ queue: [], hydrated: false, flushing: false });
}

describe('nutrition: meal queue store (issue #49)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await useMealQueueStore.getState().clear();
    restartApp();
  });

  it('saves queued meals to disk and loads them again after a restart', async () => {
    await useMealQueueStore.getState().enqueue([queued('a'), queued('b')]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toContain('Dal');

    restartApp();
    await useMealQueueStore.getState().hydrate();
    expect(useMealQueueStore.getState().queue.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('ignores unreadable data on disk instead of crashing', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.mealQueue, '{not json');
    await useMealQueueStore.getState().hydrate();
    expect(useMealQueueStore.getState().queue).toEqual([]);
  });

  it('sends queued meals, then removes them from memory and disk', async () => {
    await useMealQueueStore.getState().enqueue([queued('a'), queued('b')]);
    const send = jest.fn<Promise<void>, [QueuedMeal]>().mockResolvedValue(undefined);
    const result = await useMealQueueStore.getState().flush(send);
    expect(result).toEqual({ sent: 2, rejected: 0, stoppedEarly: false });
    expect(send.mock.calls.map(([meal]) => meal.id)).toEqual(['a', 'b']);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toBeNull();
  });

  it('does not double-send when a second reconnect arrives while a flush is running', async () => {
    await useMealQueueStore.getState().enqueue([queued('a')]);
    let release: () => void = () => undefined;
    const send = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const first = useMealQueueStore.getState().flush(send);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await useMealQueueStore.getState().flush(send);
    expect(second).toBeNull();
    release();
    await first;
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps a meal the server rejected, saved and flagged, until the user dismisses it', async () => {
    await useMealQueueStore.getState().enqueue([queued('a')]);
    await useMealQueueStore
      .getState()
      .flush(jest.fn().mockRejectedValue(new ApiError('bad', 'validation', 422)));
    expect(rejectedMeals(useMealQueueStore.getState().queue)).toHaveLength(1);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toContain('rejected');

    await useMealQueueStore.getState().dismissRejected();
    expect(useMealQueueStore.getState().queue).toEqual([]);
  });

  it('wipes the queue in memory and on disk at logout', async () => {
    await useMealQueueStore.getState().enqueue([queued('a')]);
    await useMealQueueStore.getState().clear();
    expect(useMealQueueStore.getState().queue).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.mealQueue)).toBeNull();
  });
});
