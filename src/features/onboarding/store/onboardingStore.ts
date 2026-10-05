import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '@/shared/lib/storage';
import type {
  ActivityLevel,
  BudgetTier,
  CookingFrequency,
  CuisinePreference,
  DietType,
  GoalType,
  HealthCondition,
} from '@/shared/types/dietProfile';
import type { Gender } from '@/shared/types/user';

export type OnboardingPillar = 'fitness' | 'diet' | 'wellness';

/**
 * The in-progress *interview* answer draft (docs/onboarding-v2-flow-plan.md §1) — every field
 * that used to live behind signup now lives here first. Field names/types mirror `DietProfile`
 * (shared/types/dietProfile.ts) exactly except every field is nullable/empty here (vs. the
 * server's own defaults for `meal_frequency`/`cooking_time_max`) — this is a draft, not yet a
 * committed profile, so "unanswered" must be representable for every field. `goal_type` is asked
 * directly now (v2 §5) rather than derived — see `features/onboarding/lib/resolveGoalType.ts` for
 * the fallback-only heuristic.
 */
export type DietProfileDraft = {
  goal_type: GoalType | null;
  diet_type: DietType | null;
  allergies: string[];
  disliked_foods: string[];
  cuisine_preference: CuisinePreference | null;
  target_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  cooking_frequency: CookingFrequency | null;
  meal_frequency: number | null;
  budget_tier: BudgetTier | null;
  health_conditions: HealthCondition[];
};

export const DIET_PROFILE_DRAFT_DEFAULTS: DietProfileDraft = {
  goal_type: null,
  diet_type: null,
  allergies: [],
  disliked_foods: [],
  cuisine_preference: null,
  target_weight_kg: null,
  activity_level: null,
  cooking_frequency: null,
  meal_frequency: null,
  budget_tier: null,
  health_conditions: [],
};

/** List-shaped fields on `DietProfileDraft` — the ones a `toggleDietListValue` call can target. */
export type DietProfileListField = 'allergies' | 'disliked_foods' | 'health_conditions';

/**
 * The in-progress onboarding answer draft (docs/onboarding-v2-flow-plan.md §1). `dietProfile`
 * covers the whole nutrition interview (now including `goal_type`); fitness/wellness
 * pillar-interview fields remain a later build phase (F2 in feature-map.md — no API home yet).
 *
 * Deliberately plain client state, not TanStack Query: nothing here is server data — it only
 * becomes server data once the *entire* interview commits in one shot at "Save your core" (v2 §2:
 * register, then a single `PUT /users/me/diet-profile/`). Persisted (see `persist` below) so
 * killing the app mid-interview doesn't lose progress — signup moved to the very end, so unlike
 * the old flow there's no account yet to have saved it server-side (v2 §3). Cleared on `reset()`,
 * called once the flow hands off to `(app)` home.
 */
export type OnboardingDraft = {
  name: string;
  ageYears: number;
  gender: Gender | null;
  heightCm: number;
  weightKg: number;
  pillars: OnboardingPillar[];
  dietProfile: DietProfileDraft;
  /** D10 "weak moment" (12a·6) — mock/assistant-only, no API field (F3 in the refinement plan);
   * never sent in the diet-profile PUT. */
  weakMoments: string[];
};

export const ONBOARDING_DEFAULTS: OnboardingDraft = {
  name: '',
  ageYears: 28,
  gender: null,
  heightCm: 170,
  weightKg: 70,
  pillars: [],
  dietProfile: DIET_PROFILE_DRAFT_DEFAULTS,
  weakMoments: [],
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
  updateDietProfile: (patch: Partial<DietProfileDraft>) => void;
  toggleDietListValue: (field: DietProfileListField, value: string) => void;
  toggleWeakMoment: (value: string) => void;
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

      updateDietProfile: (patch) =>
        set((state) => ({
          draft: { ...state.draft, dietProfile: { ...state.draft.dietProfile, ...patch } },
        })),

      toggleDietListValue: (field, value) =>
        set((state) => {
          // Cast to `string[]` here: callers (the config-driven `DietQuestionScreen`) only have
          // raw option values typed as `string`, not the narrower per-field enum unions — the
          // config itself is the source of truth that those strings are valid members.
          const current = state.draft.dietProfile[field] as string[];
          return {
            draft: {
              ...state.draft,
              dietProfile: {
                ...state.draft.dietProfile,
                [field]: toggleInList(current, value),
              },
            },
          };
        }),

      toggleWeakMoment: (value) =>
        set((state) => ({
          draft: { ...state.draft, weakMoments: toggleInList(state.draft.weakMoments, value) },
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
