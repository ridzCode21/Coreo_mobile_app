import { create } from 'zustand';

import { onSessionEnd } from '@/shared/lib/sessionCleanup';
import {
  dismissRejected,
  enqueueMeals,
  flushMealQueue,
  parseMealQueue,
  type FlushResult,
  type QueuedMeal,
} from '@/features/nutrition/lib/mealQueue';
import {
  clearMealQueueStorage,
  readMealQueue,
  writeMealQueue,
} from '@/features/nutrition/lib/mealQueueStorage';

type NewQueuedMeal = Pick<QueuedMeal, 'id' | 'createdAt' | 'date' | 'entry'>;

type MealQueueState = {
  queue: QueuedMeal[];
  hydrated: boolean;
  flushing: boolean;
  /** Loads the saved queue from disk once; safe to call repeatedly. */
  hydrate: () => Promise<void>;
  /** Saves meals to disk and the in-memory queue. Resolves `false` if they could not be saved. */
  enqueue: (meals: NewQueuedMeal[]) => Promise<boolean>;
  /** Sends pending meals. A second call while one is running returns `null` (no double sending). */
  flush: (send: (meal: QueuedMeal) => Promise<unknown>) => Promise<FlushResult | null>;
  dismissRejected: () => Promise<void>;
  /** Logout: forget everything, in memory and on disk. */
  clear: () => Promise<void>;
};

/**
 * Small client-only mirror of the offline meal queue (architecture.md §3). Disk is the source of
 * truth across restarts; every change is written through `writeChain` one at a time so a slow
 * write can never overwrite a newer one.
 */
let writeChain: Promise<void> = Promise.resolve();
let hydrating: Promise<void> | null = null;

export const useMealQueueStore = create<MealQueueState>((set, get) => {
  const persist = (): Promise<void> => {
    writeChain = writeChain.then(() => writeMealQueue(get().queue)).catch(() => undefined);
    return writeChain;
  };

  const setQueue = async (queue: QueuedMeal[]) => {
    set({ queue });
    await persist();
  };

  return {
    queue: [],
    hydrated: false,
    flushing: false,

    hydrate: () => {
      if (get().hydrated) return Promise.resolve();
      hydrating ??= readMealQueue()
        .then((saved) => {
          // Anything queued before the disk read finished stays, after the older saved meals.
          set({ queue: parseMealQueue([...saved, ...get().queue]), hydrated: true });
        })
        .finally(() => {
          hydrating = null;
        });
      return hydrating;
    },

    enqueue: async (meals) => {
      await get().hydrate();
      const next = enqueueMeals(get().queue, meals);
      if (!next) return false;
      try {
        set({ queue: next });
        await persist();
        return true;
      } catch {
        return false;
      }
    },

    flush: async (send) => {
      if (get().flushing) return null;
      set({ flushing: true });
      try {
        await get().hydrate();
        return await flushMealQueue({ getQueue: () => get().queue, update: setQueue, send });
      } finally {
        set({ flushing: false });
      }
    },

    dismissRejected: async () => {
      await setQueue(dismissRejected(get().queue));
    },

    clear: async () => {
      hydrating = null;
      set({ queue: [], hydrated: true });
      writeChain = writeChain.then(() => clearMealQueueStorage()).catch(() => undefined);
      await writeChain;
    },
  };
});

onSessionEnd(() => useMealQueueStore.getState().clear());
