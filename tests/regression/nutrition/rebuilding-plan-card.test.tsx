/**
 * Issue #36 — design screen 34a ("Rebuilding your plan… Fitting it to "Too much cooking."",
 * design-spec.md lines "34a Regenerate · rebuilding"). `MealPlanScreen` today has no branch at all
 * for a plan whose status is `pending`/`generating`/`validating` — it falls through to
 * "No plan is ready yet. Generate one from Diet." (`MealPlanScreen.tsx:209`). This protects the new
 * standalone `RebuildingPlanCard`, which maps the plan's real `status` to the design's 3-step
 * progress indicator and shows the picked reason without inventing per-reason copy the design
 * never provided (plan.md Decision #4).
 */

import { render, screen } from '@testing-library/react-native';

import { RebuildingPlanCard } from '@/features/nutrition/components/RebuildingPlanCard';

describe('nutrition: RebuildingPlanCard (issue #36, design 34a)', () => {
  it('always shows the title and footer', () => {
    render(<RebuildingPlanCard status="pending" reason={null} />);
    expect(screen.getByText('Rebuilding your plan…')).toBeTruthy();
    expect(screen.getByText("This won't count against today until it's ready.")).toBeTruthy();
  });

  it('always shows all three step labels verbatim regardless of reason', () => {
    render(<RebuildingPlanCard status="generating" reason="too_boring" />);
    expect(screen.getByText('Hearing you out')).toBeTruthy();
    expect(screen.getByText('Swapping out the heavy cooking')).toBeTruthy();
    expect(screen.getByText('Double-checking it adds up')).toBeTruthy();
  });

  it('shows the reason subtitle when a reason is known', () => {
    render(<RebuildingPlanCard status="pending" reason="too_much_cooking" />);
    expect(screen.getByText('Fitting it to "Too much cooking."')).toBeTruthy();
  });

  it('omits the subtitle line entirely when reason is null', () => {
    render(<RebuildingPlanCard status="pending" reason={null} />);
    expect(screen.queryByText(/Fitting it to/)).toBeNull();
  });

  describe('step progress mapping', () => {
    it('status=pending → step 1 active, steps 2-3 not started', () => {
      render(<RebuildingPlanCard status="pending" reason={null} />);
      expect(screen.getByTestId('rebuild-step-0-active')).toBeTruthy();
      expect(screen.queryByTestId('rebuild-step-1-active')).toBeNull();
      expect(screen.queryByTestId('rebuild-step-1-done')).toBeNull();
      expect(screen.queryByTestId('rebuild-step-2-active')).toBeNull();
      expect(screen.queryByTestId('rebuild-step-2-done')).toBeNull();
    });

    it('status=generating → step 1 done, step 2 active, step 3 not started', () => {
      render(<RebuildingPlanCard status="generating" reason={null} />);
      expect(screen.getByTestId('rebuild-step-0-done')).toBeTruthy();
      expect(screen.getByTestId('rebuild-step-1-active')).toBeTruthy();
      expect(screen.queryByTestId('rebuild-step-2-active')).toBeNull();
      expect(screen.queryByTestId('rebuild-step-2-done')).toBeNull();
    });

    it('status=validating → steps 1-2 done, step 3 active', () => {
      render(<RebuildingPlanCard status="validating" reason={null} />);
      expect(screen.getByTestId('rebuild-step-0-done')).toBeTruthy();
      expect(screen.getByTestId('rebuild-step-1-done')).toBeTruthy();
      expect(screen.getByTestId('rebuild-step-2-active')).toBeTruthy();
    });
  });
});
