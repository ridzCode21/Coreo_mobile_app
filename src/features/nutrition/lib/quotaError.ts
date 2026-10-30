import { ApiError } from '@/shared/api/errors';
import { planQuotaSchema } from '@/features/nutrition/schemas';
import type { PlanActionQuota, QuotaExceededError } from '@/shared/types/mealPlan';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function quotaErrorFrom(error: unknown): QuotaExceededError | null {
  if (!(error instanceof ApiError) || error.status !== 429 || !isRecord(error.details)) return null;
  return error.details.error === 'quota_exceeded'
    ? (error.details as unknown as QuotaExceededError)
    : null;
}

export function planGenerateQuotaFromNotFoundError(error: unknown): PlanActionQuota | undefined {
  if (
    !(error instanceof ApiError) ||
    error.status !== 404 ||
    !isRecord(error.details) ||
    error.details.error !== 'plan_not_found'
  ) {
    return undefined;
  }

  const quota = planQuotaSchema.safeParse(error.details.quota);
  return quota.success ? quota.data.plan_generate : undefined;
}

export function resetDistance(resetIso: string): string {
  const reset = new Date(resetIso).getTime();
  if (!Number.isFinite(reset)) return 'soon';
  const diffMs = Math.max(0, reset - Date.now());
  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (hours <= 1) return 'under 1h';
  return `${hours}h`;
}
