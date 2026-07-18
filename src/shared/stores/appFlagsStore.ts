import { create } from 'zustand';

import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

type AppFlagsState = {
  hydrated: boolean;
  /** Pre-auth "has this device seen the First-open screen" — distinct from the server-side
   * `onboarding_complete` fact (features/onboarding, once built). See
   * docs/implementation-plan.md §5. */
  hasSeenFirstOpen: boolean;
  hydrate: () => Promise<void>;
  markFirstOpenSeen: () => Promise<void>;
};

/**
 * Small app-wide client-only flags that aren't server data and aren't scoped to one feature —
 * see docs/architecture.md §2's `shared/stores/`. Keep this store limited to genuinely
 * cross-feature flags; anything feature-specific belongs in that feature's own store.
 */
export const useAppFlagsStore = create<AppFlagsState>((set) => ({
  hydrated: false,
  hasSeenFirstOpen: false,

  hydrate: async () => {
    const seen = await storage.getJSON<boolean>(STORAGE_KEYS.hasSeenFirstOpen);
    set({ hasSeenFirstOpen: seen ?? false, hydrated: true });
  },

  markFirstOpenSeen: async () => {
    await storage.setJSON(STORAGE_KEYS.hasSeenFirstOpen, true);
    set({ hasSeenFirstOpen: true });
  },
}));
