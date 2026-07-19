import { create } from 'zustand';

export type OnboardingPillar = 'fitness' | 'diet' | 'wellness';
export type OnboardingSource = 'apple_health' | 'apple_watch' | 'whoop' | 'oura';

/**
 * The in-progress onboarding answer draft (7a·1–7a·8 + 8a — see docs/implementation-plan.md §1
 * and docs/API_REFERENCE.md §5). Diet/fitness/wellness pillar-interview fields are added in later
 * build phases (12a/16a/17a) — this type only covers the "core setup" steps built so far.
 *
 * Deliberately plain client state, not TanStack Query: nothing here is server data yet — it only
 * becomes server data once committed (register at 8a, then `PUT /users/me/diet-profile/` for the
 * diet pillar). Ephemeral by design: killing the app mid-flow loses progress, same as any
 * un-submitted multi-step form; not persisted to AsyncStorage/SecureStore.
 */
export type OnboardingDraft = {
  name: string;
  goals: string[];
  ageYears: number;
  heightCm: number;
  weightKg: number;
  pillars: OnboardingPillar[];
  sources: OnboardingSource[];
};

export const ONBOARDING_DEFAULTS: OnboardingDraft = {
  name: '',
  goals: [],
  ageYears: 28,
  heightCm: 170,
  weightKg: 70,
  pillars: [],
  sources: [],
};

type OnboardingState = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  toggleGoal: (goal: string) => void;
  togglePillar: (pillar: OnboardingPillar) => void;
  toggleSource: (source: OnboardingSource) => void;
  reset: () => void;
};

function toggleInList<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/** Onboarding's client-only draft state — see docs/architecture.md §3 (Zustand for small,
 * non-server client state). Reset at the start of every fresh run from `FirstOpenScreen`. */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  draft: ONBOARDING_DEFAULTS,

  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),

  toggleGoal: (goal) =>
    set((state) => ({ draft: { ...state.draft, goals: toggleInList(state.draft.goals, goal) } })),

  togglePillar: (pillar) =>
    set((state) => ({
      draft: { ...state.draft, pillars: toggleInList(state.draft.pillars, pillar) },
    })),

  toggleSource: (source) =>
    set((state) => ({
      draft: { ...state.draft, sources: toggleInList(state.draft.sources, source) },
    })),

  reset: () => set({ draft: ONBOARDING_DEFAULTS }),
}));
