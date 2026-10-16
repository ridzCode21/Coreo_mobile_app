/**
 * Issue #29 — Week in review screen. `weeklyDietReviewSchema` must validate the real
 * `GET /insights/weekly-diet-review/` contract field-for-field, as `review_payload()` defines it
 * (`apps/insights/weekly_review.py:131-147`), not an invented or simplified shape. Backend
 * `file:line` refs are to the read-only snapshot at `.state/refs/backend`.
 */

import { weeklyDietReviewSchema } from '@/features/nutrition/schemas';

function fullPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    week_start: '2026-09-28',
    week_end: '2026-10-04',
    generated_at: '2026-10-04T18:00:00+00:00',
    days_on_target: 5,
    headline: "It's working.",
    subtitle: 'Protein up, weight following.',
    adherence_line: 'Five of seven on target.',
    pattern_callout: "Fridays and Saturdays run late and heavy, that's a pattern, not a failure.",
    recommendation: {
      title: 'Move Friday dinner earlier',
      detail: 'Late Friday dinners cost you Saturday too. Move it an hour. That fixes both days.',
    },
    days: [
      {
        date: '2026-09-28',
        weekday: 'Monday',
        calories_in: 2000,
        protein_g: 100,
        weight_kg: 79.0,
        target_calories: 2000,
        on_target: true,
        late_dinner: false,
      },
      {
        date: '2026-09-29',
        weekday: 'Tuesday',
        calories_in: 1900,
        protein_g: 95,
        weight_kg: null,
        target_calories: 2000,
        on_target: true,
        late_dinner: false,
      },
      {
        date: '2026-09-30',
        weekday: 'Wednesday',
        calories_in: 1800,
        protein_g: 90,
        weight_kg: null,
        target_calories: 1960,
        on_target: false,
        late_dinner: false,
      },
      {
        date: '2026-10-01',
        weekday: 'Thursday',
        calories_in: 1960,
        protein_g: 100,
        weight_kg: null,
        target_calories: 1960,
        on_target: true,
        late_dinner: false,
      },
      {
        date: '2026-10-02',
        weekday: 'Friday',
        calories_in: 2500,
        protein_g: 100,
        weight_kg: null,
        target_calories: 1960,
        on_target: false,
        late_dinner: true,
      },
      {
        date: '2026-10-03',
        weekday: 'Saturday',
        calories_in: 2400,
        protein_g: 90,
        weight_kg: null,
        target_calories: 1960,
        on_target: false,
        late_dinner: true,
      },
      {
        date: '2026-10-04',
        weekday: 'Sunday',
        calories_in: 2000,
        protein_g: 100,
        weight_kg: 79.0,
        target_calories: 1960,
        on_target: false,
        late_dinner: false,
      },
    ],
    target_changes: [
      {
        previous_calories: 2000,
        new_calories: 1960,
        changed_at: '2026-09-30T09:00:00+00:00',
        source: 'calculated',
        note: 'Targets were recalculated from your profile.',
      },
    ],
    ...overrides,
  };
}

describe('nutrition schemas: weeklyDietReviewSchema (issue #29)', () => {
  it('accepts a full payload shaped exactly like review_payload() (weekly_review.py:131-147)', () => {
    const result = weeklyDietReviewSchema.safeParse(fullPayload());
    expect(result.success).toBe(true);
  });

  it('accepts weight_kg, target_calories and previous_calories as null (all nullable backend fields)', () => {
    const payload = fullPayload({
      days: fullPayload().days.map((day) => ({ ...day, weight_kg: null, target_calories: null })),
      target_changes: [
        {
          previous_calories: null,
          new_calories: 1900,
          changed_at: '2026-09-28T08:00:00+00:00',
          source: 'manual',
          note: 'You set this target.',
        },
      ],
    });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts an empty subtitle ("subtitle is empty when there is no protein or weight signal")', () => {
    const payload = fullPayload({ subtitle: '' });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts an empty target_changes array (no calorie-target edit this week)', () => {
    const payload = fullPayload({ target_changes: [] });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a payload with fewer than 7 days ("days is always seven objects" — weekly_review.py:73)', () => {
    const payload = fullPayload({ days: fullPayload().days.slice(0, 6) });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects a missing recommendation.detail', () => {
    const payload = fullPayload({ recommendation: { title: 'Keep this week' } });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an invalid target_changes source value', () => {
    const payload = fullPayload({
      target_changes: [
        {
          previous_calories: 2000,
          new_calories: 1960,
          changed_at: '2026-09-30T09:00:00+00:00',
          source: 'guessed',
          note: 'Targets were recalculated from your profile.',
        },
      ],
    });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts zero in PositiveIntegerField-backed calorie targets', () => {
    const payload = fullPayload({
      days: fullPayload().days.map((day) => ({ ...day, target_calories: 0 })),
      target_changes: [
        {
          ...fullPayload().target_changes[0],
          previous_calories: 0,
          new_calories: 0,
        },
      ],
    });
    expect(weeklyDietReviewSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects non-ISO dates and datetimes', () => {
    expect(
      weeklyDietReviewSchema.safeParse(fullPayload({ week_start: 'next Monday' })).success,
    ).toBe(false);
    expect(
      weeklyDietReviewSchema.safeParse(fullPayload({ generated_at: 'yesterday' })).success,
    ).toBe(false);
  });
});
