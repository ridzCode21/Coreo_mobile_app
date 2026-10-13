/**
 * Issue #35 — pure logic behind the replace flow's 30b confirm step. The backend's alternative
 * `rationale` is always prefixed with the literal string "Approx. " by a validator
 * (`apps/core/services/meal_planner.py:28-35`) that the design never shows (`stripApproxPrefix`).
 * The preview token's TTL is 600s (`apps/core/services/assistant_dispatcher.py:36`,
 * `PREVIEW_TTL = 600`, shared by `dispatcher.store_preview` which
 * `apps/meals/views.py:452` calls) — the countdown and its "expired" check are computed
 * client-side from that, never from the API (the response has no expiry field). The delta line is
 * verified against the design's own example numbers (design-spec.md lines 100-109: "Tofu
 * stir-fry, brown rice" / "610 kcal · +40 vs original · 8g less carbs").
 */

import { ApiError } from '@/shared/api/errors';
import {
  deltaLine,
  formatCountdown,
  PREVIEW_TTL_MS,
  previewNotFoundFrom,
  serviceUnavailableFrom,
  stripApproxPrefix,
} from '@/features/nutrition/lib/replacePreview';

describe('nutrition replace lib: stripApproxPrefix (issue #35)', () => {
  it('strips the literal "Approx. " prefix the backend always adds', () => {
    expect(stripApproxPrefix('Approx. Closest match to tonight.')).toBe(
      'Closest match to tonight.',
    );
  });

  it('leaves text without the prefix untouched', () => {
    expect(stripApproxPrefix('Lighter, more protein')).toBe('Lighter, more protein');
  });

  it('only strips a leading occurrence, not one later in the string', () => {
    expect(stripApproxPrefix('Not Approx. anything here')).toBe('Not Approx. anything here');
  });
});

describe('nutrition replace lib: formatCountdown (issue #35)', () => {
  it('formats the design\'s own example: 522000ms (8m42s) as "8:42"', () => {
    expect(formatCountdown(522_000)).toBe('8:42');
  });

  it('pads single-digit seconds', () => {
    expect(formatCountdown(65_000)).toBe('1:05');
  });

  it('floors to "0:00" at or below zero, never negative', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5_000)).toBe('0:00');
  });

  it('the full TTL (600000ms) formats as "10:00"', () => {
    expect(formatCountdown(PREVIEW_TTL_MS)).toBe('10:00');
  });
});

describe('nutrition replace lib: deltaLine (issue #35)', () => {
  it("matches the design's own example exactly (design-spec.md:106)", () => {
    const original = { calories_kcal: 570, carbs_g: 66 };
    const alternative = { calories_kcal: 610, carbs_g: 58 };
    expect(deltaLine(original, alternative)).toBe('610 kcal · +40 vs original · 8g less carbs');
  });

  it('shows a negative kcal delta with a minus sign (no double sign)', () => {
    const original = { calories_kcal: 700, carbs_g: 50 };
    const alternative = { calories_kcal: 650, carbs_g: 55 };
    expect(deltaLine(original, alternative)).toBe('650 kcal · -50 vs original · 5g more carbs');
  });

  it('shows "+0 vs original" and "same carbs" at exact parity', () => {
    const original = { calories_kcal: 600, carbs_g: 60 };
    const alternative = { calories_kcal: 600, carbs_g: 60 };
    expect(deltaLine(original, alternative)).toBe('600 kcal · +0 vs original · same carbs');
  });
});

describe('nutrition replace lib: error classification (issue #35)', () => {
  it('previewNotFoundFrom recognizes a 404 preview_not_found error', () => {
    const error = new ApiError('gone', 'unknown', 404, { error: 'preview_not_found' });
    expect(previewNotFoundFrom(error)).toBe(true);
  });

  it('previewNotFoundFrom rejects other errors', () => {
    expect(
      previewNotFoundFrom(
        new ApiError('bad', 'validation', 400, { error: 'invalid_chosen_index' }),
      ),
    ).toBe(false);
    expect(previewNotFoundFrom(new Error('not an ApiError'))).toBe(false);
  });

  it('serviceUnavailableFrom recognizes a 503 service_temporarily_unavailable error', () => {
    const error = new ApiError('down', 'server', 503, {
      error: 'service_temporarily_unavailable',
    });
    expect(serviceUnavailableFrom(error)).toBe(true);
  });

  it('serviceUnavailableFrom rejects other errors', () => {
    expect(serviceUnavailableFrom(new ApiError('nope', 'server', 500, { error: 'other' }))).toBe(
      false,
    );
  });
});
