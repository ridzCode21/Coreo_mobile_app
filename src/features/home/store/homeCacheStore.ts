import { create } from 'zustand';

import { onSessionEnd } from '@/shared/lib/sessionCleanup';
import {
  buildHomeCache,
  clearHomeCacheStorage,
  readHomeCache,
  writeHomeCache,
  type HomeCache,
} from '@/features/home/lib/homeCache';

type HomeCacheState = {
  cache: HomeCache | null;
  hydrated: boolean;
  /** Loads the saved copy from disk once; safe to call repeatedly. */
  hydrate: () => Promise<void>;
  /** Remembers that Home's summary for `date` was fetched at `savedAt`. */
  save: (date: string, savedAt: Date) => Promise<void>;
  /** Logout: forget the saved day, in memory and on disk. */
  clear: () => Promise<void>;
};

let hydrating: Promise<void> | null = null;

/** Small client-only mirror of the saved Home day (architecture.md §3). */
export const useHomeCacheStore = create<HomeCacheState>((set, get) => ({
  cache: null,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    hydrating ??= readHomeCache()
      .then((saved) => {
        // A fresh save made before the disk read finished wins over the older saved copy.
        set({ cache: get().cache ?? saved, hydrated: true });
      })
      .finally(() => {
        hydrating = null;
      });
    return hydrating;
  },

  save: async (date, savedAt) => {
    const cache = buildHomeCache(date, savedAt);
    set({ cache });
    try {
      await writeHomeCache(cache);
    } catch {
      // The in-memory copy still works for this session; only the restart copy is missing.
    }
  },

  clear: async () => {
    hydrating = null;
    set({ cache: null, hydrated: true });
    await clearHomeCacheStorage().catch(() => undefined);
  },
}));

onSessionEnd(() => useHomeCacheStore.getState().clear());
