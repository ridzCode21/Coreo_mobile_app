/**
 * Issue #138 — screen 28a (`PlanNoPlanState`) must read the plan-generate quota off the no-plan
 * 404 so "Uses N of L plans today · M left after this" shows real numbers before any plan exists
 * for the day. The backend now returns `quota: plan_quota(request.user)` alongside the bare
 * Style-B `plan_not_found` error (apps/meals/views.py:152-156). This mirrors `quotaErrorFrom`'s
 * loose-shape check in the same file: unknown or missing quota must stay undefined, never a guess.
 */
import { ApiError } from '@/shared/api/errors';
import { planGenerateQuotaFromNotFoundError } from '@/features/nutrition/lib/quotaError';

const validQuota = {
  tier: 'free',
  quota_resets_at: '2026-10-31T00:00:00Z',
  plan_generate: { limit: 2, used: 1, remaining: 1 },
  plan_regenerate: { limit: 2, used: 0, remaining: 2 },
};

function notFoundError(details?: unknown): ApiError {
  return new ApiError('not found', 'unknown', 404, details);
}

describe('nutrition: planGenerateQuotaFromNotFoundError (issue #138)', () => {
  it('returns undefined for a non-ApiError', () => {
    expect(planGenerateQuotaFromNotFoundError(new Error('boom'))).toBeUndefined();
  });

  it('returns undefined when the status is not 404', () => {
    const error = new ApiError('server error', 'server', 500, {
      error: 'plan_not_found',
      quota: validQuota,
    });
    expect(planGenerateQuotaFromNotFoundError(error)).toBeUndefined();
  });

  it('returns undefined for a 404 that is not plan_not_found', () => {
    expect(
      planGenerateQuotaFromNotFoundError(notFoundError({ error: 'meal_not_found' })),
    ).toBeUndefined();
  });

  it('returns undefined when the 404 has no quota (old backend contract, before Self_dev#82)', () => {
    expect(
      planGenerateQuotaFromNotFoundError(notFoundError({ error: 'plan_not_found' })),
    ).toBeUndefined();
  });

  it('returns undefined when quota is present but malformed', () => {
    expect(
      planGenerateQuotaFromNotFoundError(
        notFoundError({ error: 'plan_not_found', quota: { tier: 'enterprise' } }),
      ),
    ).toBeUndefined();
  });

  it('extracts plan_generate from a real quota payload', () => {
    const error = notFoundError({ error: 'plan_not_found', quota: validQuota });
    expect(planGenerateQuotaFromNotFoundError(error)).toEqual({
      limit: 2,
      used: 1,
      remaining: 1,
    });
  });
});
