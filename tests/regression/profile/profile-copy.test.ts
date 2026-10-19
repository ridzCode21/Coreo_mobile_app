/**
 * Issue #44 — the profile screen (design-spec.md 19a) composes every line of copy from real API
 * data; several things the design shows (a goal date, "Week 6", "adaptive", "carbs early") have no
 * backend field at all (issue body, `apps/users/models.py` / `serializers.py` checked — no such
 * fields exist). These pure functions are the single place that decides what can honestly be
 * shown, so the screen component never has to guess. Kept out of the component so the "never
 * invent a number" rule is covered without rendering anything.
 */

import {
  membershipSummary,
  formatGoalSummary,
  dietPillarSummary,
  fitnessPillarSummary,
  wellnessPillarSummary,
  checkInStyleLabel,
  connectedSourcesSummary,
} from '@/features/profile/lib/profileCopy';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

function source(overrides: Partial<SourceStatus> & Pick<SourceStatus, 'source'>): SourceStatus {
  return { connected: false, last_synced_at: null, synced_through: null, ...overrides };
}

describe('profile: membershipSummary (design-spec.md #5 "With Coreo since March · Week 6")', () => {
  it('computes the month name and week number from created_at, never a literal date', () => {
    // 2026-03-02 (Mon) -> 2026-04-06 (Mon) is exactly 35 days = floor(35/7)+1 = Week 6.
    const result = membershipSummary('2026-03-02T00:00:00Z', new Date('2026-04-06T00:00:00Z'));
    expect(result).toBe('With Coreo since March · Week 6');
  });

  it('never drops below Week 1, even on the day the account was created', () => {
    const result = membershipSummary('2026-03-02T00:00:00Z', new Date('2026-03-02T00:00:00Z'));
    expect(result).toBe('With Coreo since March · Week 1');
  });
});

describe('profile: formatGoalSummary (issue: "A goal date field does not exist")', () => {
  it('shows "<weight> → <target> kg" when both numbers exist and differ', () => {
    expect(formatGoalSummary(78, 72)).toBe('78 → 72 kg');
  });

  it('never invents a trajectory when the weights are equal', () => {
    expect(formatGoalSummary(70, 70)).toBeNull();
  });

  it('never invents a trajectory when target weight is missing', () => {
    expect(formatGoalSummary(78, null)).toBeNull();
  });

  it('never invents a trajectory when current weight is missing', () => {
    expect(formatGoalSummary(null, 72)).toBeNull();
  });
});

describe('profile: dietPillarSummary (DietProfileSerializer, apps/users/serializers.py:248-275)', () => {
  it('combines diet type and calories with a comma-formatted number', () => {
    expect(dietPillarSummary('vegetarian', 1960)).toBe('Vegetarian · 1,960 kcal');
  });

  it('shows only calories when diet_type is not set', () => {
    expect(dietPillarSummary(null, 1960)).toBe('1,960 kcal');
  });

  it('shows only diet type when daily_calories is unset (0)', () => {
    expect(dietPillarSummary('vegetarian', 0)).toBe('Vegetarian');
  });

  it('is null when neither is set, never a placeholder sentence', () => {
    expect(dietPillarSummary(null, 0)).toBeNull();
  });
});

describe('profile: fitnessPillarSummary (fitness_payload, apps/users/services/fitness_profile.py:12-18)', () => {
  it('combines goal, training place and sport', () => {
    expect(fitnessPillarSummary('build_muscle', ['home_dumbbells_band'], ['cricket'])).toBe(
      'Build muscle · home dumbbells · cricket',
    );
  });

  it('falls back to just the goal when no places or sports are set', () => {
    expect(fitnessPillarSummary('build_muscle', [], [])).toBe('Build muscle');
  });

  it('is null with no fitness interview answers at all, never a placeholder sentence', () => {
    expect(fitnessPillarSummary('', [], [])).toBeNull();
  });

  it('never includes the "3 days" training-frequency clause (not this endpoint\'s data)', () => {
    const result = fitnessPillarSummary('build_muscle', ['home_dumbbells_band'], ['cricket']);
    expect(result).not.toMatch(/\d+ days/);
  });

  it("keeps the backend's nothing_regular sport selection visible instead of silently dropping it", () => {
    expect(fitnessPillarSummary('', [], ['nothing_regular'])).toBe('nothing regular');
  });
});

describe('profile: wellnessPillarSummary (wellness_payload, apps/users/services/wellness_profile.py:12-19)', () => {
  it('combines focus and "no numbers" when hide_numbers is true', () => {
    expect(wellnessPillarSummary('racing_mind', true)).toBe('Racing mind · no numbers');
  });

  it('shows only the focus when hide_numbers is false', () => {
    expect(wellnessPillarSummary('racing_mind', false)).toBe('Racing mind');
  });

  it('is null with no wellness interview answer, never a placeholder sentence', () => {
    expect(wellnessPillarSummary('', false)).toBeNull();
  });

  it("never includes a wind-down time (not this endpoint's data)", () => {
    const result = wellnessPillarSummary('racing_mind', true);
    expect(result).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('profile: checkInStyleLabel (check_in_style)', () => {
  it('maps step_in to "Steps in early"', () => {
    expect(checkInStyleLabel('step_in')).toBe('Steps in early');
  });

  it('maps only_when_i_come to "Only when I check in"', () => {
    expect(checkInStyleLabel('only_when_i_come')).toBe('Only when I check in');
  });

  it('is null when the interview has not set a style, never a default guess', () => {
    expect(checkInStyleLabel('')).toBeNull();
  });
});

describe('profile: connectedSourcesSummary (GET /integrations/sources/)', () => {
  it('lists only the sources actually reported connected, in source order', () => {
    const sources = [
      source({ source: 'apple_health', connected: true }),
      source({ source: 'health_connect', connected: false }),
      source({ source: 'strava', connected: true }),
    ];
    expect(connectedSourcesSummary(sources)).toBe('Apple Health · Strava');
  });

  it('never claims "nothing else" when nothing is connected — says so honestly instead', () => {
    const sources = [
      source({ source: 'apple_health', connected: false }),
      source({ source: 'health_connect', connected: false }),
      source({ source: 'strava', connected: false }),
    ];
    expect(connectedSourcesSummary(sources)).toBe('Not connected yet');
  });

  it('never shows the literal design example ("Apple Health · Strava · nothing else") verbatim', () => {
    const sources = [
      source({ source: 'apple_health', connected: true }),
      source({ source: 'health_connect', connected: true }),
      source({ source: 'strava', connected: false }),
    ];
    expect(connectedSourcesSummary(sources)).not.toBe('Apple Health · Strava · nothing else');
    expect(connectedSourcesSummary(sources)).toBe('Apple Health · Health Connect');
  });
});
