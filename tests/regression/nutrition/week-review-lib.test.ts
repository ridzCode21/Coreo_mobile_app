/**
 * Issue #29 — Week in review screen. Pure helpers that turn the real
 * `GET /insights/weekly-diet-review/` payload (`review_payload()`, weekly_review.py:131-147) into
 * display values, without inventing anything the API didn't say.
 */

import {
  dayBarHeightPercent,
  formatCalories,
  formatWeekRange,
  latestTargetChange,
} from '@/features/nutrition/lib/weekReview';
import type {
  WeeklyDietReviewDay,
  WeeklyDietReviewTargetChange,
} from '@/shared/types/weeklyDietReview';

function day(overrides: Partial<WeeklyDietReviewDay> = {}): WeeklyDietReviewDay {
  return {
    date: '2026-09-28',
    weekday: 'Monday',
    calories_in: 2000,
    protein_g: 100,
    weight_kg: null,
    target_calories: 2000,
    on_target: true,
    late_dinner: false,
    ...overrides,
  };
}

function targetChange(
  overrides: Partial<WeeklyDietReviewTargetChange> = {},
): WeeklyDietReviewTargetChange {
  return {
    previous_calories: 2000,
    new_calories: 1960,
    changed_at: '2026-09-30T09:00:00+00:00',
    source: 'calculated',
    note: 'Targets were recalculated from your profile.',
    ...overrides,
  };
}

describe('nutrition lib: formatWeekRange (issue #29)', () => {
  it('formats a range within the same month as "Sep 28 – Oct 4" style, cross-month', () => {
    expect(formatWeekRange('2026-09-28', '2026-10-04')).toBe('Sep 28 – Oct 4');
  });

  it('formats a range within the same month', () => {
    expect(formatWeekRange('2026-10-05', '2026-10-11')).toBe('Oct 5 – Oct 11');
  });

  it('formats a range crossing a year boundary', () => {
    expect(formatWeekRange('2026-12-28', '2027-01-03')).toBe('Dec 28 – Jan 3');
  });
});

describe('nutrition lib: formatCalories (issue #29)', () => {
  it('formats a 4-digit number with a thousands separator', () => {
    expect(formatCalories(1960)).toBe('1,960');
  });

  it('formats a number under 1000 with no separator', () => {
    expect(formatCalories(760)).toBe('760');
  });
});

describe('nutrition lib: dayBarHeightPercent (issue #29)', () => {
  it('is 100 when calories_in meets target exactly', () => {
    expect(dayBarHeightPercent(day({ calories_in: 2000, target_calories: 2000 }))).toBe(100);
  });

  it('clamps to 100 when calories_in exceeds target', () => {
    expect(dayBarHeightPercent(day({ calories_in: 3000, target_calories: 2000 }))).toBe(100);
  });

  it('is proportional to the real ratio below target', () => {
    expect(dayBarHeightPercent(day({ calories_in: 1000, target_calories: 2000 }))).toBe(50);
  });

  it('floors at 8 rather than inventing a mid-range value when target_calories is null', () => {
    expect(dayBarHeightPercent(day({ calories_in: 1800, target_calories: null }))).toBe(8);
  });

  it('floors at 8 rather than inventing a mid-range value when nothing was logged', () => {
    expect(dayBarHeightPercent(day({ calories_in: 0, target_calories: 2000 }))).toBe(8);
  });

  it('never returns a value outside [8, 100]', () => {
    expect(
      dayBarHeightPercent(day({ calories_in: 1, target_calories: 2000 })),
    ).toBeGreaterThanOrEqual(8);
    expect(
      dayBarHeightPercent(day({ calories_in: 50000, target_calories: 2000 })),
    ).toBeLessThanOrEqual(100);
  });
});

describe('nutrition lib: latestTargetChange (issue #29)', () => {
  it('returns null for an empty array (no target change this week)', () => {
    expect(latestTargetChange([])).toBeNull();
  });

  it('returns the only change when there is one', () => {
    const change = targetChange();
    expect(latestTargetChange([change])).toBe(change);
  });

  it('returns the last change in array order when there are several (backend pre-sorts ascending by changed_at)', () => {
    const first = targetChange({ new_calories: 2000, changed_at: '2026-09-28T08:00:00+00:00' });
    const second = targetChange({ new_calories: 1960, changed_at: '2026-09-30T09:00:00+00:00' });
    expect(latestTargetChange([first, second])).toBe(second);
  });
});
