import type { Href } from 'expo-router';

import { DIET_QUESTIONS } from '@/features/onboarding/lib/dietQuestions';
import type { OnboardingDraft } from '@/features/onboarding/store/onboardingStore';

/**
 * The whole interview, as one ordered list — docs/onboarding-v2-flow-plan.md §1/§5 "Unified
 * sequencer". Bespoke screens (`name`, `about-you`, `gender`, `pillars`, `promise`) and
 * config-driven diet-interview questions (everything else, defined in `dietQuestions.ts`) are
 * interleaved here in the actual user-facing order, so this file — not each screen — owns "what
 * comes next", "which dot is active", and "which steps are conditionally skipped". `gender` is
 * its own screen rather than folded into `about-you` — a combined age/gender/height/weight screen
 * didn't lay out cleanly against the design's "question near the top, answer near the bottom"
 * template, and a separate screen sidesteps that rather than fighting it. `calibrating` and
 * `save` follow the interview but render no progress dots (matches the design source, which shows
 * 8a Save without a dot rail) — see `DOT_STEP_IDS` below.
 */
export const FLOW_STEP_IDS = [
  'name',
  'goal',
  'about-you',
  'gender',
  'pillars',
  'target',
  'activity',
  'diet-type',
  'cuisine',
  'off-the-table',
  'who-cooks',
  'meal-rhythm',
  'budget',
  'health',
  'weak-moment',
  'promise',
  'calibrating',
  'save',
] as const;

export type FlowStepId = (typeof FLOW_STEP_IDS)[number];

/** The subset that renders progress dots — everything except the two terminal screens. */
const DOT_STEP_IDS: FlowStepId[] = FLOW_STEP_IDS.filter(
  (id) => id !== 'calibrating' && id !== 'save',
);

const DIET_QUESTION_IDS = new Set<string>(DIET_QUESTIONS.map((question) => question.id));

function isDietFlowId(id: FlowStepId): boolean {
  return DIET_QUESTION_IDS.has(id);
}

const BESPOKE_ROUTE: Partial<Record<FlowStepId, Href>> = {
  name: '/(public)/onboarding/name',
  'about-you': '/(public)/onboarding/about-you',
  gender: '/(public)/onboarding/gender',
  pillars: '/(public)/onboarding/pillars',
  promise: '/(public)/onboarding/promise',
  calibrating: '/(public)/onboarding/diet/calibrating',
  save: '/(public)/onboarding/save',
};

/** Every diet-interview question (including the net-new `goal`) is routed through the one
 * generic `(public)/onboarding/diet/[step]` screen — see `DietQuestionScreen`. */
export function flowStepRoute(step: FlowStepId): Href {
  if (isDietFlowId(step)) {
    return { pathname: '/(public)/onboarding/diet/[step]', params: { step } };
  }
  return BESPOKE_ROUTE[step] ?? '/(public)/onboarding/name';
}

/**
 * The only conditional skip in the flow today (onboarding-v2-flow-plan.md §1, row 5): the
 * target-weight slider only makes sense when the stated goal is actually about weight. Kept as an
 * explicit, single `switch` case here — the "one pure place" the plan asks for — rather than a
 * generic `visibleIf` mechanism on every question, since there's exactly one conditional step.
 */
export function isFlowStepVisible(step: FlowStepId, draft: OnboardingDraft): boolean {
  if (step === 'target') {
    return (
      draft.dietProfile.goal_type === 'lose_weight' || draft.dietProfile.goal_type === 'gain_muscle'
    );
  }
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
