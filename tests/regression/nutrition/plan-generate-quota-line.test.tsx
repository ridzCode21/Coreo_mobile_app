/**
 * Issue #138 — design/issue copy for the plan-generate quota line. The value passed in is the
 * current backend `quota.plan_generate` object (apps/core/services/quota.py). The line
 * describes the next generate: `used + 1` and `max(0, remaining - 1)`.
 */
import { render, screen } from '@testing-library/react-native';

import { PlanGenerateQuotaLine } from '@/features/nutrition/components/PlanGenerateQuotaLine';
import { colors } from '@/shared/theme/tokens';

describe('nutrition: PlanGenerateQuotaLine (issue #138)', () => {
  it('renders nothing when the backend did not return usage', () => {
    render(<PlanGenerateQuotaLine quota={undefined} />);
    expect(screen.queryByText(/plans today/i)).toBeNull();
  });

  it('uses the exact template with real normal-state numbers', () => {
    render(<PlanGenerateQuotaLine quota={{ limit: 2, used: 0, remaining: 2 }} />);
    expect(screen.getByText('Uses 1 of 2 plans today · 1 left after this')).toHaveStyle({
      color: colors.ink45,
    });
  });

  it('uses the returned premium limit rather than the design’s example number', () => {
    render(<PlanGenerateQuotaLine quota={{ limit: 5, used: 1, remaining: 4 }} />);
    expect(screen.getByText('Uses 2 of 5 plans today · 3 left after this')).toBeTruthy();
  });

  it('shows zero left after the final available generate', () => {
    render(<PlanGenerateQuotaLine quota={{ limit: 5, used: 4, remaining: 1 }} />);
    expect(screen.getByText('Uses 5 of 5 plans today · 0 left after this')).toBeTruthy();
  });

  it('hides the line once the limit is reached because the design specifies no exhausted copy', () => {
    render(<PlanGenerateQuotaLine quota={{ limit: 2, used: 2, remaining: 0 }} />);
    expect(screen.queryByText(/plans today/i)).toBeNull();
  });
});
