/**
 * Issue #31 — shared status→step-index mapping used by both the first-build full screen
 * (`PlanBuildingState`, design 28b) and the existing regenerate-with-reason card
 * (`RebuildingPlanCard`, issue #36). Extracted so the two screens' different copy doesn't require
 * two copies of the same `pending/generating/validating` → `0/1/2` logic (plan.md Decision #11).
 */

import { buildStepIndex } from '@/features/nutrition/lib/planBuildSteps';

describe('nutrition: buildStepIndex (issue #31)', () => {
  it('maps pending to step 0', () => {
    expect(buildStepIndex('pending')).toBe(0);
  });

  it('maps generating to step 1', () => {
    expect(buildStepIndex('generating')).toBe(1);
  });

  it('maps validating to step 2', () => {
    expect(buildStepIndex('validating')).toBe(2);
  });
});
