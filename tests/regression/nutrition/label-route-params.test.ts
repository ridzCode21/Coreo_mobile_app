/**
 * Issue #26 — route-param contracts for the label-scan result (21c) and could-not-read (25d)
 * screens. `labelResultRouteParamsSchema`/`labelResultPrefillSchema` validate the hand-off from
 * `LogMealSheet` (a serialized `LabelEstimate`, API_REFERENCE §8 /
 * `apps/core/services/inference.py:132-143`); `labelUnreadableRouteParamsSchema` validates the
 * optional API-provided title/message carried from a 422 (`apps/core/services/ai_call.py:25-28`).
 * Validated at the navigation boundary rather than trusted blindly (architecture.md §5), same
 * pattern as `photoResultRouteParamsSchema`.
 */

import {
  labelResultPrefillSchema,
  labelResultRouteParamsSchema,
  labelUnreadableRouteParamsSchema,
} from '@/features/nutrition/schemas';

const VALID_ESTIMATE = {
  name: 'Protein bar',
  portion_grams: 60,
  est_calories: 210,
  est_protein_g: 20,
  est_carbs_g: 22,
  est_fat_g: 6,
  servings_per_container: 2.5,
  confidence: 0.95,
  guessed: false,
  guess_note: null,
  remembered: false,
  serving_size_text: null,
};

describe('nutrition: label-result route params (issue #26)', () => {
  it('requires a non-empty serialized prefill', () => {
    expect(labelResultRouteParamsSchema.parse({ prefill: '{}' })).toEqual({ prefill: '{}' });
    expect(() => labelResultRouteParamsSchema.parse({ prefill: '' })).toThrow();
    expect(() => labelResultRouteParamsSchema.parse({})).toThrow();
  });

  it('parses the full label estimate shape, matching the API field names exactly', () => {
    expect(labelResultPrefillSchema.parse(VALID_ESTIMATE)).toEqual(VALID_ESTIMATE);
  });

  it('requires servings_per_container to be a positive number when known — a container can never have 0 servings', () => {
    expect(() =>
      labelResultPrefillSchema.parse({ ...VALID_ESTIMATE, servings_per_container: 0 }),
    ).toThrow();
    expect(() =>
      labelResultPrefillSchema.parse({ ...VALID_ESTIMATE, servings_per_container: -1 }),
    ).toThrow();
  });

  // Issue #137: apps/core/services/inference.py:146 — servings_per_container is null when the
  // label doesn't print a servings count; the backend is explicitly told not to invent one
  // (inference.py:223-224).
  it('accepts a null servings_per_container — not every label states a servings count', () => {
    expect(
      labelResultPrefillSchema.parse({ ...VALID_ESTIMATE, servings_per_container: null }),
    ).toEqual({ ...VALID_ESTIMATE, servings_per_container: null });
  });

  // Issue #137: inference.py:151 — the printed serving phrase, e.g. "1 bar (68g)".
  it('accepts a populated serving_size_text and keeps a null one', () => {
    expect(
      labelResultPrefillSchema.parse({ ...VALID_ESTIMATE, serving_size_text: '1 bar (68g)' }),
    ).toEqual({ ...VALID_ESTIMATE, serving_size_text: '1 bar (68g)' });
    expect(labelResultPrefillSchema.parse(VALID_ESTIMATE).serving_size_text).toBeNull();
  });

  it('rejects a prefill missing a required macro field', () => {
    const { est_protein_g: _omit, ...incomplete } = VALID_ESTIMATE;
    expect(() => labelResultPrefillSchema.parse(incomplete)).toThrow();
  });
});

describe('nutrition: label-unreadable route params (issue #26)', () => {
  it('accepts the API-provided title and message', () => {
    expect(
      labelUnreadableRouteParamsSchema.parse({
        title: "I couldn't read that label.",
        message: "Too blurry, maybe. Describe it and I've got you.",
      }),
    ).toEqual({
      title: "I couldn't read that label.",
      message: "Too blurry, maybe. Describe it and I've got you.",
    });
  });

  it('allows both to be absent (a direct link falls back to the design copy in the screen)', () => {
    expect(labelUnreadableRouteParamsSchema.parse({})).toEqual({});
  });
});
