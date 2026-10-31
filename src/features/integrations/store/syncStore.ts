import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

export type SyncFailure = { message: string; at: string };

type SyncState = {
  /** Local `YYYY-MM-DD` of the last sync that finished, or null before the first one. Not a secret. */
  syncedThrough: string | null;
  /** ISO time of the last try, finished or not — lets the app avoid syncing on every focus. */
  lastAttemptAt: string | null;
  /** Why the last sync failed, until one works. For a screen to show; cleared on sign-out. */
  lastFailure: SyncFailure | null;
  hydrated: boolean;
  /** Bumped on sign-out, so a sync that started before it can tell it no longer belongs. */
  epoch: number;
  markAttempt: (at: Date) => void;
  markSynced: (syncedThrough: string) => void;
  markFailed: (message: string, at: Date) => void;
  reset: () => void;
};

/** Small client-only record of how far this phone has synced. Server data stays in TanStack Query. */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      syncedThrough: null,
      lastAttemptAt: null,
      lastFailure: null,
      hydrated: false,
      epoch: 0,
      markAttempt: (at) => set({ lastAttemptAt: at.toISOString() }),
      markSynced: (syncedThrough) => set({ syncedThrough, lastFailure: null }),
      markFailed: (message, at) => set({ lastFailure: { message, at: at.toISOString() } }),
      reset: () =>
        set((state) => ({
          syncedThrough: null,
          lastAttemptAt: null,
          lastFailure: null,
          epoch: state.epoch + 1,
        })),
    }),
    {
      name: STORAGE_KEYS.healthSyncCursor,
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        syncedThrough: state.syncedThrough,
        lastAttemptAt: state.lastAttemptAt,
        lastFailure: state.lastFailure,
      }),
      onRehydrateStorage: () => () => useSyncStore.setState({ hydrated: true }),
    },
  ),
);

/** Loads the saved cursor if it isn't loaded yet; the background task can start before it is. */
export async function ensureSyncStoreHydrated(): Promise<void> {
  if (!useSyncStore.getState().hydrated) await useSyncStore.persist.rehydrate();
}
