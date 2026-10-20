/**
 * Issue #50 — `insightsResponseSchema` must match `GET /insights/` exactly, for all three
 * statuses the backend can return (`apps/insights/views.py:92-122`):
 *   - `not_enough_data` (`views.py:99-106`): `{status, days_logged, days_remaining}`.
 *   - `no_insights` (`views.py:109-115`): `{status, message}`.
 *   - `ready` (`views.py:117-122`): `{status, insights: InsightCard[]}`, each card serialized by
 *     `InsightCardSerializer` (`apps/insights/serializers.py:34-52`): `id, col_x, col_y, r_value,
 *     lag_days, insight_text, autocorrelation_warning, created_at, disclaimer`. `col_x`/`col_y`
 *     enum values come from `apps/insights/services.py:28-37`.
 *
 * There is no `confidence`/`generated_at`/effect-size field anywhere in the real payload — this
 * is a regression guard against a future change inventing one.
 */

import {
  CORRELATION_COLUMNS,
  insightCardSchema,
  insightsResponseSchema,
} from '@/features/patterns/api/insightsApi';

const VALID_CARD = {
  id: 7,
  col_x: 'sleep_hours',
  col_y: 'steps',
  r_value: -0.42,
  lag_days: 1,
  insight_text: 'Patterns suggest more sleep may be related to higher step counts.',
  autocorrelation_warning: false,
  created_at: '2026-06-01T12:00:00Z',
  disclaimer:
    'Health patterns only. Not medical advice. Consult a healthcare provider for medical decisions.',
};

describe('patterns: insightsResponseSchema (GET /insights/, #50)', () => {
  it('has exactly the 10 correlation columns the backend supports', () => {
    expect(CORRELATION_COLUMNS).toEqual([
      'calories_in',
      'calories_out',
      'protein_g',
      'carbs_g',
      'fat_g',
      'water_ml',
      'steps',
      'weight_kg',
      'sleep_hours',
      'hrv',
    ]);
  });

  it('parses the not_enough_data shape', () => {
    const result = insightsResponseSchema.parse({
      status: 'not_enough_data',
      days_logged: 15,
      days_remaining: 15,
    });
    expect(result).toEqual({ status: 'not_enough_data', days_logged: 15, days_remaining: 15 });
  });

  it('rejects not_enough_data with an unknown extra field', () => {
    expect(() =>
      insightsResponseSchema.parse({
        status: 'not_enough_data',
        days_logged: 15,
        days_remaining: 15,
        confidence: 0.9,
      }),
    ).toThrow();
  });

  it('parses the no_insights shape', () => {
    const result = insightsResponseSchema.parse({
      status: 'no_insights',
      message: 'Keep logging...',
    });
    expect(result).toEqual({ status: 'no_insights', message: 'Keep logging...' });
  });

  it('rejects no_insights missing message', () => {
    expect(() => insightsResponseSchema.parse({ status: 'no_insights' })).toThrow();
  });

  it('parses the ready shape with one insight card exactly', () => {
    const result = insightsResponseSchema.parse({ status: 'ready', insights: [VALID_CARD] });
    expect(result).toEqual({ status: 'ready', insights: [VALID_CARD] });
  });

  it('parses the ready shape with an empty insights array', () => {
    const result = insightsResponseSchema.parse({ status: 'ready', insights: [] });
    expect(result).toEqual({ status: 'ready', insights: [] });
  });

  it('parses a single insight card in isolation', () => {
    expect(insightCardSchema.parse(VALID_CARD)).toEqual(VALID_CARD);
  });

  it('rejects a card with an unknown extra field (e.g. an invented "confidence")', () => {
    expect(() => insightCardSchema.parse({ ...VALID_CARD, confidence: 0.8 })).toThrow();
  });

  it('rejects a card with an unsupported col_x value', () => {
    expect(() => insightCardSchema.parse({ ...VALID_CARD, col_x: 'mood_score' })).toThrow();
  });

  it('rejects a card missing disclaimer', () => {
    const { disclaimer: _disclaimer, ...withoutDisclaimer } = VALID_CARD;
    expect(() => insightCardSchema.parse(withoutDisclaimer)).toThrow();
  });

  it('rejects an unknown status literal', () => {
    expect(() => insightsResponseSchema.parse({ status: 'calibrated', days_logged: 1 })).toThrow();
  });
});
