import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/shared/lib/storage';
import type { ActivePillar } from '@/shared/types/user';

type PillarSelectionState = {
  activePillars: ActivePillar[];
  hasHydrated: boolean;
  setActivePillars: (activePillars: ActivePillar[]) => void;
  setHasHydrated: (value: boolean) => void;
  clear: () => void;
};

export const usePillarSelectionStore = create<PillarSelectionState>()(
  persist(
    (set) => ({
      activePillars: [],
      hasHydrated: false,
      setActivePillars: (activePillars) => set({ activePillars }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      clear: () => set({ activePillars: [] }),
    }),
    {
      name: 'coreo.auth.pillar-selection.v1',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ activePillars: state.activePillars }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
