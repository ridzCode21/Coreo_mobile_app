import type { Href } from 'expo-router';

import type { OnboardingDraft } from '@/features/onboarding/store/onboardingStore';

/**
 * The "core setup" step chain (7a·1–7a·7) plus the 8a save/register terminus — see
 * docs/implementation-plan.md §1/§4. Pillar-specific interviews (12a diet / 16a fitness / 17a
 * wellness) and 7a·8 Arrival are later build phases; `save` is intentionally the last entry this
 * sequencer knows about — `SaveScreen` decides where to go after a successful register itself,
 * since that decision depends on screens that don't exist yet.
 */
export const ONBOARDING_STEP_IDS = [
  'name',
  'goals',
  'about-you',
  'pillars',
  'sources',
  'reading',
  'promise',
  'save',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

const ROUTE_BY_STEP: Record<OnboardingStepId, Href> = {
  name: '/(public)/onboarding/name',
  goals: '/(public)/onboarding/goals',
  'about-you': '/(public)/onboarding/about-you',
  pillars: '/(public)/onboarding/pillars',
  sources: '/(public)/onboarding/sources',
  reading: '/(public)/onboarding/reading',
  promise: '/(public)/onboarding/promise',
  save: '/(public)/onboarding/save',
};

export function onboardingStepRoute(step: OnboardingStepId): Href {
  return ROUTE_BY_STEP[step];
}

/**
 * Pure "what comes after this step" decision, kept out of screen components — same pattern as
 * `features/splash/lib/resolveLaunchDestination.ts`. The one branch (skipping "Reading" when no
 * source was connected at "Sources") lives here instead of being copy-pasted into a screen.
 */
export function getNextOnboardingStep(
  current: OnboardingStepId,
  draft: OnboardingDraft,
): OnboardingStepId {
  switch (current) {
    case 'name':
      return 'goals';
    case 'goals':
      return 'about-you';
    case 'about-you':
      return 'pillars';
    case 'pillars':
      return 'sources';
    case 'sources':
      // "Reading" celebrates a connected source syncing in — meaningless if the user chose to
      // log by hand (zero sources connected), so skip straight to the promise screen.
      return draft.sources.length > 0 ? 'reading' : 'promise';
    case 'reading':
      return 'promise';
    case 'promise':
      return 'save';
    case 'save':
      return 'save';
  }
}

/** 8 total: the 7 core steps + 7a·8 Arrival (not built yet, reserved as the final dot). 8a Save
 * itself renders no dots at all in the design source — see screens-source.html. */
export const ONBOARDING_PROGRESS_TOTAL = 8;

const PROGRESS_INDEX: Partial<Record<OnboardingStepId, number>> = {
  name: 0,
  goals: 1,
  'about-you': 2,
  pillars: 3,
  sources: 4,
  reading: 5,
  promise: 6,
};

export function onboardingProgressIndex(step: OnboardingStepId): number | null {
  return PROGRESS_INDEX[step] ?? null;
}
