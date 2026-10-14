/**
 * Issue #36 — `QuotaBanner` currently shows a "{tier} · {limit}/day" chip
 * (`QuotaBanner.tsx:19-23`). `docs/mvp.md` frames the daily regenerate cap as a shared wait, not an
 * upgrade tier, and the issue says explicitly: "Remove the 'free · 2/day' tier chip." This protects
 * that removal while keeping the existing label/message/reset-distance copy working.
 */

import { render, screen } from '@testing-library/react-native';

import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import type { QuotaExceededError } from '@/shared/types/mealPlan';

const ERROR: QuotaExceededError = {
  error: 'quota_exceeded',
  action: 'plan_regenerate',
  message: "You've used all your regenerates for today.",
  limit: 2,
  tier: 'free',
  quota_resets_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
};

describe('nutrition: QuotaBanner (issue #36)', () => {
  it('shows the label and the backend message with a reset distance', () => {
    render(<QuotaBanner error={ERROR} />);
    expect(screen.getByText(/limit is spent/i)).toBeTruthy();
    expect(screen.getByText(/You've used all your regenerates for today\./)).toBeTruthy();
    expect(screen.getByText(/More unlocks in/)).toBeTruthy();
  });

  it('never shows "free"/"premium" tier text or a "/day" chip', () => {
    render(<QuotaBanner error={ERROR} />);
    expect(screen.queryByText(/free/i)).toBeNull();
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText(/\/day/)).toBeNull();
  });

  it('still shows the same copy for a premium-tier error (tier is never rendered either way)', () => {
    render(<QuotaBanner error={{ ...ERROR, tier: 'premium', limit: 5 }} />);
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText(/\/day/)).toBeNull();
  });
});
