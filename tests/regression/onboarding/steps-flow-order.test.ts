/**
 * Issue #10 — design file lines 211-364 (7a·1 Name, 7a·2 Goal, 7a·3 Pillars, 7a·4 "About you ·
 * only if Diet was picked") puts Pillars third, before About you, and only has an About-you screen
 * at all when Diet was picked. The app previously asked Pillars fifth (after a separate Gender
 * screen) and showed About-you to everyone — `lib/steps.ts` always returned `true` from
 * `isFlowStepVisible` (pre-fix `src/features/onboarding/lib/steps.ts:30-34`). This protects: the
 * new step order (name, goal, pillars, about-you, save — `gender` is no longer its own step, see
 * `about-you-screen.test.tsx`), that `about-you` is skipped unless `diet` is in `draft.pillars`,
 * and that `nextFlowStep`/`flowStepProgress` route and count around that gate correctly in both
 * directions.
 */

import {
  FLOW_STEP_IDS,
  flowStepProgress,
  isFlowStepVisible,
  nextFlowStep,
} from '@/features/onboarding/lib/steps';
import {
  ONBOARDING_DEFAULTS,
  type OnboardingDraft,
} from '@/features/onboarding/store/onboardingStore';

function draftWithPillars(pillars: OnboardingDraft['pillars']): OnboardingDraft {
  return { ...ONBOARDING_DEFAULTS, pillars };
}

describe('onboarding: step order and Diet-only About-you gate (issue #10)', () => {
  it('orders the core-setup steps name, goal, pillars, about-you, save', () => {
    expect(FLOW_STEP_IDS).toEqual(['name', 'goal', 'pillars', 'about-you', 'save']);
  });

  it('no longer has a standalone gender step', () => {
    expect(FLOW_STEP_IDS).not.toContain('gender');
  });

  it('hides about-you when Diet was not picked', () => {
    expect(isFlowStepVisible('about-you', draftWithPillars(['fitness', 'wellness']))).toBe(false);
    expect(isFlowStepVisible('about-you', draftWithPillars([]))).toBe(false);
  });

  it('shows about-you once Diet was picked', () => {
    expect(isFlowStepVisible('about-you', draftWithPillars(['diet']))).toBe(true);
    expect(isFlowStepVisible('about-you', draftWithPillars(['diet', 'fitness']))).toBe(true);
  });

  it('always shows name, goal, pillars and save regardless of pillar choice', () => {
    for (const step of ['name', 'goal', 'pillars', 'save'] as const) {
      expect(isFlowStepVisible(step, draftWithPillars([]))).toBe(true);
      expect(isFlowStepVisible(step, draftWithPillars(['diet']))).toBe(true);
    }
  });

  it('routes from pillars straight to save when Diet was not picked', () => {
    expect(nextFlowStep('pillars', draftWithPillars(['fitness']))).toBe('save');
  });

  it('routes from pillars to about-you when Diet was picked', () => {
    expect(nextFlowStep('pillars', draftWithPillars(['diet']))).toBe('about-you');
  });

  it('routes from about-you to save', () => {
    expect(nextFlowStep('about-you', draftWithPillars(['diet']))).toBe('save');
  });

  it('counts about-you in the progress dots only when Diet was picked', () => {
    expect(flowStepProgress('pillars', draftWithPillars(['diet']))).toEqual({ index: 2, total: 4 });
    expect(flowStepProgress('about-you', draftWithPillars(['diet']))).toEqual({
      index: 3,
      total: 4,
    });
    expect(flowStepProgress('pillars', draftWithPillars(['fitness']))).toEqual({
      index: 2,
      total: 3,
    });
  });
});
