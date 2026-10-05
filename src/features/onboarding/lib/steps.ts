import type { Href } from 'expo-router';

import type { OnboardingDraft } from '@/features/onboarding/store/onboardingStore';

/**
 * Minimal pre-signup onboarding (docs/onboarding-v3-minimal-drip-plan.md): collect only the facts
 * needed to create an account and produce honest starter targets. The longer diet interview now
 * lives inside the signed-in Diet tab as progressive personalization nudges.
 */
export const FLOW_STEP_IDS = ['name', 'goal', 'about-you', 'gender', 'pillars', 'save'] as const;

export type FlowStepId = (typeof FLOW_STEP_IDS)[number];

/** The subset that renders progress dots — everything except the terminal save screen. */
const DOT_STEP_IDS: FlowStepId[] = FLOW_STEP_IDS.filter((id) => id !== 'save');

const BESPOKE_ROUTE: Partial<Record<FlowStepId, Href>> = {
  name: '/(public)/onboarding/name',
  goal: '/(public)/onboarding/goal' as Href,
  'about-you': '/(public)/onboarding/about-you',
  gender: '/(public)/onboarding/gender',
  pillars: '/(public)/onboarding/pillars',
  save: '/(public)/onboarding/save',
};

export function flowStepRoute(step: FlowStepId): Href {
  return BESPOKE_ROUTE[step] ?? '/(public)/onboarding/name';
}

export function isFlowStepVisible(step: FlowStepId, draft: OnboardingDraft): boolean {
  void step;
  void draft;
  return true;
}

function visibleDotSteps(draft: OnboardingDraft): FlowStepId[] {
  return DOT_STEP_IDS.filter((id) => isFlowStepVisible(id, draft));
}

/** `OnboardingStepScaffold`'s `progress` prop — `null` for `calibrating`/`save`, which render no
 * dot rail, or for a step currently hidden by `isFlowStepVisible` (shouldn't normally be asked
 * for, but fails safe). */
export function flowStepProgress(
  step: FlowStepId,
  draft: OnboardingDraft,
): { index: number; total: number } | null {
  const visible = visibleDotSteps(draft);
  const index = visible.indexOf(step);
  return index === -1 ? null : { index, total: visible.length };
}

/** Pure "what comes after this step" decision, skipping anything `isFlowStepVisible` rules out —
 * same pattern as `features/splash/lib/resolveLaunchDestination.ts`. Returns `null` only past the
 * very last step (`save`), which callers don't need since `save` itself ends the flow. */
export function nextFlowStep(current: FlowStepId, draft: OnboardingDraft): FlowStepId | null {
  let index = FLOW_STEP_IDS.indexOf(current);
  while (index !== -1 && index + 1 < FLOW_STEP_IDS.length) {
    const candidate = FLOW_STEP_IDS[index + 1];
    if (isFlowStepVisible(candidate, draft)) return candidate;
    index += 1;
  }
  return null;
}

export const FIRST_FLOW_STEP: FlowStepId = FLOW_STEP_IDS[0];

/**
 * Resume support (onboarding-v2-flow-plan.md §3): given the last step the user actually
 * completed (persisted alongside the draft — `onboardingStore`'s `lastCompletedStep`), returns
 * where they should land next. `null`/unrecognized ⇒ nothing completed yet, start from the top.
 */
export function firstUnansweredFlowStep(
  lastCompletedStep: string | null,
  draft: OnboardingDraft,
): FlowStepId {
  if (!lastCompletedStep || !(FLOW_STEP_IDS as readonly string[]).includes(lastCompletedStep)) {
    return FIRST_FLOW_STEP;
  }
  return nextFlowStep(lastCompletedStep as FlowStepId, draft) ?? FIRST_FLOW_STEP;
}
