import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

/**
 * Issue #55 — `POST /insights/import/` (backend docs §19, `apps/integrations/views.py:device_import`).
 * The real route answers a bare `{ success, source, days_written, last_synced_at, synced_through }`
 * and rejects bad input with a 400 `VALIDATION_ERROR` whose `details` name the field. The mock keeps
 * the same rules (366 days, no duplicate dates, nothing after tomorrow, sleep 0–24, no negatives)
 * and the same watermark behavior (moves forward only; an empty batch still counts as a sync).
 *
 * `GET /integrations/sources/` stays as the home feature's mock: it always reports "not connected",
 * which a regression test locks in, so a mock sync does not flip it.
 */
const SOURCES = ['apple_health', 'health_connect'] as const;
const MAX_BATCH_DAYS = 366;
const NUMBER_FIELDS = ['calories_in', 'calories_out', 'steps', 'weight_kg', 'hrv'] as const;

const syncedThrough = new Map<string, string>();

export function __resetMockDeviceSyncForTests(): void {
  syncedThrough.clear();
}

type Row = Record<string, unknown>;

const isRecord = (value: unknown): value is Row => typeof value === 'object' && value !== null;

function validationError(details: Record<string, string[]>) {
  return { status: 400, body: styleAError('VALIDATION_ERROR', 'Invalid request data', details) };
}

function tomorrowUtc(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

registerMock('POST', '/insights/import/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  const body = isRecord(request.body) ? request.body : {};
  const source = SOURCES.find((candidate) => candidate === body.source);
  if (!source) {
    return validationError({ source: [`"${String(body.source)}" is not a valid choice.`] });
  }
  if (!Array.isArray(body.daily_logs)) {
    return validationError({ daily_logs: ['This field is required.'] });
  }

  const rows = body.daily_logs;
  if (rows.length > MAX_BATCH_DAYS) {
    return validationError({ daily_logs: [`Send at most ${MAX_BATCH_DAYS} days per batch.`] });
  }

  const seen = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row) || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      return validationError({ daily_logs: ['Date has wrong format. Use YYYY-MM-DD.'] });
    }
    if (seen.has(row.date)) {
      return validationError({ daily_logs: [`Duplicate date ${row.date}.`] });
    }
    seen.add(row.date);
    if (row.date > tomorrowUtc()) {
      return validationError({ daily_logs: ['Date is in the future.'] });
    }
    for (const field of NUMBER_FIELDS) {
      const value = row[field];
      if (value !== undefined && value !== null && (typeof value !== 'number' || value < 0)) {
        return validationError({ daily_logs: [`${field} must be a number of 0 or more.`] });
      }
    }
    const sleep = row.sleep_hours;
    if (
      sleep !== undefined &&
      sleep !== null &&
      (typeof sleep !== 'number' || sleep < 0 || sleep > 24)
    ) {
      return validationError({ daily_logs: ['sleep_hours must be between 0 and 24.'] });
    }
  }

  const newest = [...seen].sort().pop() ?? null;
  const key = `${user.id}:${source}`;
  const previous = syncedThrough.get(key) ?? null;
  const next = newest !== null && (previous === null || newest > previous) ? newest : previous;
  if (next !== null) syncedThrough.set(key, next);

  return {
    status: 200,
    delayMs: 250,
    body: {
      success: true,
      source,
      days_written: rows.length,
      last_synced_at: new Date().toISOString(),
      synced_through: next,
    },
  };
});
