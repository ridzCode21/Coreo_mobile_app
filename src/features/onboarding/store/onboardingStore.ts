import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/shared/lib/storage';
import type { ActivePillar, Gender, InterviewGoal } from '@/shared/types/user';

export type OnboardingPillar = ActivePillar;

export type OnboardingDraft = {
  name: string;
  goal: InterviewGoal | null;
  ageYears: number;
  gender: Gender | null;
  heightCm: number;
  weightKg: number;
  pillars: OnboardingPillar[];
};

export const ONBOARDING_DEFAULTS: OnboardingDraft = {
  name: '',
  goal: null,
  ageYears: 28,
  gender: null,
  heightCm: 170,
  weightKg: 70,
  pillars: [],
};

type OnboardingState = {
  draft: OnboardingDraft;
  /** The last flow step (a `FlowStepId` from `lib/steps.ts`, kept as a plain string here to avoid
   * a circular import — `steps.ts` already imports `OnboardingDraft` from this file) whose answer
   * was actually confirmed. Drives resuming a killed-and-relaunched interview at the right screen
   * — see `firstUnansweredFlowStep` in `lib/steps.ts`. `null` means nothing has been completed
   * yet (a fresh run, or after `reset()`). */
  lastCompletedStep: string | null;
  update: (patch: Partial<OnboardingDraft>) => void;
  togglePillar: (pillar: OnboardingPillar) => void;
  completeStep: (stepId: string) => void;
  reset: () => void;
  /** Flips true once the persisted draft has finished loading from AsyncStorage — resume
   * decisions (splash → first-open vs. straight back into the interview) must wait for this,
   * since `draft`/`lastCompletedStep` still read as fresh defaults until then. */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
};

function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/**
 * Onboarding's client-only draft state — see docs/architecture.md §3 (Zustand for small,
 * non-server client state). Persisted to AsyncStorage (answers only, **never** tokens — those
 * stay exclusively in `secureStorage`, CLAUDE.md §6) so an app kill mid-interview can resume
 * rather than restart. Reset at the start of a deliberately fresh run from `FirstOpenScreen`
 * (when there's nothing to resume), and again once the whole flow hands off to `(app)` home.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: ONBOARDING_DEFAULTS,
      lastCompletedStep: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),

      togglePillar: (pillar) =>
        set((state) => ({
          draft: { ...state.draft, pillars: toggleInList(state.draft.pillars, pillar) },
        })),

      completeStep: (stepId) => set({ lastCompletedStep: stepId }),

      reset: () => set({ draft: ONBOARDING_DEFAULTS, lastCompletedStep: null }),
    }),
    {
      name: 'coreo.onboarding.draft.v1',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ draft: state.draft, lastCompletedStep: state.lastCompletedStep }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
