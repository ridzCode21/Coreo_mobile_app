/**
 * Issue #48 — "A source went quiet screen" (design-spec.md 25b), round 2. The backend now computes
 * its own `status` per source (`apps/integrations/readings.py:96-104` `phone_status`,
 * `apps/integrations/source_status.py:9-70`): `"live" | "quiet" | "estimate" | null`. For
 * `apple_health`/`health_connect` this is MORE authoritative than a client-chosen time window, so
 * `isSourceQuiet` now reads it directly instead of re-deriving a 24h threshold (plan.md Decision
 * log #3). Strava's `status` stays permanently `null` (`source_status.py:51-58`,
 * `docs/API_REFERENCE.md:2375`), so Strava alone keeps the client-side `QUIET_AFTER_HOURS` heuristic
 * on `last_synced_at` — the only source for which the API gives no opinion at all.
 *
 * `status: "estimate"` means this phone source is standing in for a missing wearable sleep number
 * (`readings.py:39-47`) — it says nothing about whether the source itself stopped syncing, so it
 * must never trigger the quiet banner.
 */

import type { SourceStatus } from '@/features/home/api/sourcesApi';
import {
  QUIET_AFTER_HOURS,
  isSourceQuiet,
  findQuietSource,
  buildConnectedSummary,
  formatLastSynced,
  formatSleepDuration,
  formatRecoveryValue,
  reconnectRouteForSource,
} from '@/features/profile/lib/sourceQuietStatus';

function source(overrides: Partial<SourceStatus> & Pick<SourceStatus, 'source'>): SourceStatus {
  return {
    connected: true,
    last_synced_at: null,
    synced_through: null,
    status: null,
    ...overrides,
  };
}

const NOW = new Date('2026-06-09T13:00:00.000Z');

describe('isSourceQuiet — phone sources read the backend status field (issue #48)', () => {
  it('is quiet when the backend reports status "quiet"', () => {
    expect(
      isSourceQuiet(
        source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'quiet' }),
        NOW,
      ),
    ).toBe(true);
  });

  it('is not quiet without a last_synced_at timestamp', () => {
    expect(isSourceQuiet(source({ source: 'apple_health', status: 'quiet' }), NOW)).toBe(false);
  });

  it('is not quiet when the backend reports status "live", even with an old last_synced_at', () => {
    const stale = new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString();
    expect(
      isSourceQuiet(
        source({ source: 'health_connect', last_synced_at: stale, status: 'live' }),
        NOW,
      ),
    ).toBe(false);
  });

  it('is never quiet when the backend reports status "estimate" (sleep substitution, not a sync problem)', () => {
    const stale = new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString();
    expect(
      isSourceQuiet(
        source({ source: 'apple_health', last_synced_at: stale, status: 'estimate' }),
        NOW,
      ),
    ).toBe(false);
  });

  it('is never quiet when not connected, regardless of status', () => {
    expect(
      isSourceQuiet(source({ source: 'apple_health', connected: false, status: 'quiet' }), NOW),
    ).toBe(false);
  });
});

describe('isSourceQuiet — Strava keeps the client-side 24h heuristic (backend status always null)', () => {
  it('is quiet once last_synced_at is QUIET_AFTER_HOURS old or older', () => {
    expect(QUIET_AFTER_HOURS).toBe(24);
    const exactly24h = new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString();
    expect(isSourceQuiet(source({ source: 'strava', last_synced_at: exactly24h }), NOW)).toBe(true);
  });

  it('is not quiet just under the threshold', () => {
    const justUnder = new Date(NOW.getTime() - (24 * 3600 * 1000 - 60_000)).toISOString();
    expect(isSourceQuiet(source({ source: 'strava', last_synced_at: justUnder }), NOW)).toBe(false);
  });

  it('is never quiet when last_synced_at is null (never synced yet)', () => {
    expect(isSourceQuiet(source({ source: 'strava', last_synced_at: null }), NOW)).toBe(false);
  });

  it('ignores a non-null status if one ever appeared (defensive — backend never sends one today)', () => {
    const fresh = NOW.toISOString();
    expect(
      isSourceQuiet(source({ source: 'strava', last_synced_at: fresh, status: 'quiet' }), NOW),
    ).toBe(false);
  });
});

describe('findQuietSource (issue #48)', () => {
  it('returns the first quiet source in DEVICE_SOURCES order', () => {
    const stale = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString();
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'live' }),
      source({ source: 'health_connect', last_synced_at: stale, status: 'quiet' }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    expect(findQuietSource(sources, NOW)?.source).toBe('health_connect');
  });

  it('returns null when nothing is quiet', () => {
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'live' }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    expect(findQuietSource(sources, NOW)).toBeNull();
  });
});

describe('buildConnectedSummary (issue #48)', () => {
  it('lists only connected sources as "{Label} · active/quiet" joined by " — "', () => {
    const stale = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString();
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: stale, status: 'quiet' }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    expect(buildConnectedSummary(sources, NOW)).toBe('Apple Health · quiet — Strava · active');
  });

  it('treats an "estimate" status source as active, not quiet, in the summary', () => {
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'estimate' }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: false, last_synced_at: null }),
    ];
    expect(buildConnectedSummary(sources, NOW)).toBe('Apple Health · active');
  });

  it('returns null when no source is connected', () => {
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', connected: false, last_synced_at: null }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: false, last_synced_at: null }),
    ];
    expect(buildConnectedSummary(sources, NOW)).toBeNull();
  });

  it('never mentions Whoop', () => {
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'live' }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    expect(buildConnectedSummary(sources, NOW)).not.toMatch(/whoop/i);
  });
});

describe('formatLastSynced (issue #48, UTC-deterministic like profileCopy.membershipSummary)', () => {
  it('formats a timestamp from the previous UTC calendar day as "yesterday, h:mm AM/PM"', () => {
    expect(formatLastSynced('2026-06-08T23:40:00.000Z', NOW)).toBe('yesterday, 11:40 PM');
  });

  it('formats a timestamp from the same UTC calendar day as "today, h:mm AM/PM"', () => {
    expect(formatLastSynced('2026-06-09T06:05:00.000Z', NOW)).toBe('today, 6:05 AM');
  });

  it('formats an older timestamp as "Mon D, h:mm AM/PM"', () => {
    expect(formatLastSynced('2026-06-01T08:00:00.000Z', NOW)).toBe('Jun 1, 8:00 AM');
  });
});

describe('formatSleepDuration (issue #48 — last_night.sleep.hours, apps/integrations/models.py:107 FloatField)', () => {
  it("formats the design's literal example: 6h 40m from 6.6667 hours", () => {
    expect(formatSleepDuration(6 + 40 / 60)).toBe('6h 40m');
  });

  it('formats a whole number of hours with 0 minutes', () => {
    expect(formatSleepDuration(7)).toBe('7h 0m');
  });

  it('rounds to the nearest minute', () => {
    expect(formatSleepDuration(5 + 15.6 / 60)).toBe('5h 16m');
  });

  it('rolls 59.6 minutes up into the next hour instead of showing "60m"', () => {
    expect(formatSleepDuration(3 + 59.6 / 60)).toBe('4h 0m');
  });
});

describe('formatRecoveryValue (issue #48 — last_night.recovery, docs/API_REFERENCE.md:2379)', () => {
  it('renders the literal design copy when recovery is null', () => {
    expect(formatRecoveryValue(null)).toBe('Unavailable today');
  });

  it('renders the real score when present, never an invented unit', () => {
    expect(formatRecoveryValue({ score: 82 })).toBe('82');
  });
});

describe('reconnectRouteForSource (issue #48 — "Reconnect opens the right permission or sign in flow")', () => {
  it('routes phone sources to the OS permission settings screen, not an API call', () => {
    expect(reconnectRouteForSource('apple_health')).toEqual({ kind: 'settings' });
    expect(reconnectRouteForSource('health_connect')).toEqual({ kind: 'settings' });
  });

  it('routes Strava to the existing manage-sources screen (no in-app Strava connect flow exists yet)', () => {
    expect(reconnectRouteForSource('strava')).toEqual({
      kind: 'navigate',
      href: '/profile/manage-sources',
    });
  });
});
