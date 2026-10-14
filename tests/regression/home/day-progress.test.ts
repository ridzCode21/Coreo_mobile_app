/**
 * Issue #18 — the Home "Today" hero wave must split solid (past) / dashed (future) at the
 * current time of day, matching design-spec.md 24b/10a/23a's "Morning / Now / Evening" axis.
 * `WaveChart`'s `progress` prop (`src/shared/components/WaveChart.tsx:24`) is purely decorative
 * (a fixed sine shape, not real data points) — the backend has no intraday metric series
 * (`apps/insights/models.py` `DailyLog` is a single daily aggregate, no hourly field), so the only
 * honest, non-invented input for `progress` is "how much of today has elapsed", a fact computed
 * from the clock, not fabricated. `dayProgress` is that pure computation.
 */

import { dayProgress } from '@/features/home/lib/dayProgress';

describe('home: dayProgress (issue #18)', () => {
  it('returns 0 at midnight', () => {
    expect(dayProgress(new Date(2026, 6, 6, 0, 0))).toBe(0);
  });

  it('returns 0.5 at noon', () => {
    expect(dayProgress(new Date(2026, 6, 6, 12, 0))).toBe(0.5);
  });

  it('returns just under 1 at 23:59', () => {
    expect(dayProgress(new Date(2026, 6, 6, 23, 59))).toBeCloseTo(1439 / 1440, 5);
  });

  it('is always within [0, 1]', () => {
    for (const hour of [0, 1, 6, 8, 12, 17, 20, 23]) {
      const value = dayProgress(new Date(2026, 6, 6, hour, 30));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
