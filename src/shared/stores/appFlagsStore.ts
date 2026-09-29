import { create } from 'zustand';

import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

type AppFlagsState = {
  hydrated: boolean;
  /** Pre-auth "has this device seen the First-open screen" — distinct from the server-side
   * `onboarding_complete` fact (features/onboarding, once built). See
   * docs/implementation-plan.md §5. */
  hasSeenFirstOpen: boolean;
  dismissedDietQuickSetup: boolean;
  visitedProfileSections: Record<string, boolean>;
  hydrate: () => Promise<void>;
  markFirstOpenSeen: () => Promise<void>;
  dismissDietQuickSetup: () => Promise<void>;
  markProfileSectionVisited: (section: string) => Promise<void>;
};

/**
 * Small app-wide client-only flags that aren't server data and aren't scoped to one feature —
 * see docs/architecture.md §2's `shared/stores/`. Keep this store limited to genuinely
 * cross-feature flags; anything feature-specific belongs in that feature's own store.
 */
export const useAppFlagsStore = create<AppFlagsState>((set, get) => ({
  hydrated: false,
  hasSeenFirstOpen: false,
  dismissedDietQuickSetup: false,
  visitedProfileSections: {},

  hydrate: async () => {
    const [seen, dismissedDietQuickSetup, visitedProfileSections] = await Promise.all([
      storage.getJSON<boolean>(STORAGE_KEYS.hasSeenFirstOpen),
      storage.getJSON<boolean>(STORAGE_KEYS.dismissedDietQuickSetup),
      storage.getJSON<Record<string, boolean>>(STORAGE_KEYS.visitedProfileSections),
    ]);
    set({
      hasSeenFirstOpen: seen ?? false,
      dismissedDietQuickSetup: dismissedDietQuickSetup ?? false,
      visitedProfileSections: visitedProfileSections ?? {},
      hydrated: true,
    });
  },

  markFirstOpenSeen: async () => {
    await storage.setJSON(STORAGE_KEYS.hasSeenFirstOpen, true);
    set({ hasSeenFirstOpen: true });
  },

  dismissDietQuickSetup: async () => {
    await storage.setJSON(STORAGE_KEYS.dismissedDietQuickSetup, true);
    set({ dismissedDietQuickSetup: true });
  },

  markProfileSectionVisited: async (section) => {
    const next = { ...get().visitedProfileSections, [section]: true };
    await storage.setJSON(STORAGE_KEYS.visitedProfileSections, next);
    set({ visitedProfileSections: next });
  },
}));
