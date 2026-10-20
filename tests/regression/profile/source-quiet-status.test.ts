/**
 * Issue #48 — "A source went quiet screen" (design-spec.md 25b). The backend's
 * `GET /integrations/sources/` (`apps/integrations/views.py:17-19`,
 * `apps/integrations/source_status.py:9-46`) gives only `connected` and `last_synced_at` per
 * source — no "quiet" flag, no sleep-estimate marker, no recovery value (issue "Backend
 * dependency" section; `source_status.py:34-37` and API_REFERENCE.md §20 confirm Strava's
 * `last_synced_at` is always `null`). So "quiet" is an app-chosen threshold on `last_synced_at`,
 * and a source with a `null` timestamp (always true for Strava today) can never be flagged quiet —
 * that gap is filed in backend-needs.md, not invented here.
 */

import type { SourceStatus } from '@/features/home/api/sourcesApi';
import {
  QUIET_AFTER_HOURS,
  isSourceQuiet,
  findQuietSource,
  buildConnectedSummary,
  formatLastSynced,
  reconnectRouteForSource,
} from '@/features/profile/lib/sourceQuietStatus';

function source(overrides: Partial<SourceStatus> & Pick<SourceStatus, 'source'>): SourceStatus {
  return { connected: true, last_synced_at: null, synced_through: null, ...overrides };
}

const NOW = new Date('2026-06-09T13:00:00.000Z');

describe('isSourceQuiet (issue #48)', () => {
  it('is quiet once last_synced_at is QUIET_AFTER_HOURS old or older', () => {
    expect(QUIET_AFTER_HOURS).toBe(24);
    const exactly24h = new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString();
    expect(isSourceQuiet(source({ source: 'apple_health', last_synced_at: exactly24h }), NOW)).toBe(
      true,
    );
  });

  it('is not quiet just under the threshold', () => {
    const justUnder = new Date(NOW.getTime() - (24 * 3600 * 1000 - 60_000)).toISOString();
    expect(
      isSourceQuiet(source({ source: 'health_connect', last_synced_at: justUnder }), NOW),
    ).toBe(false);
  });

  it('is never quiet when last_synced_at is null (Strava today)', () => {
    expect(isSourceQuiet(source({ source: 'strava', last_synced_at: null }), NOW)).toBe(false);
  });

  it('is never quiet when not connected, even with a stale timestamp', () => {
    const stale = new Date(NOW.getTime() - 48 * 3600 * 1000).toISOString();
    expect(
      isSourceQuiet(
        source({ source: 'apple_health', connected: false, last_synced_at: stale }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('findQuietSource (issue #48)', () => {
  it('returns the first quiet source in DEVICE_SOURCES order', () => {
    const stale = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString();
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: new Date(NOW).toISOString() }),
      source({ source: 'health_connect', last_synced_at: stale }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    expect(findQuietSource(sources, NOW)?.source).toBe('health_connect');
  });

  it('returns a source with a timestamp when a source is quiet', () => {
    const stale = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString();
    const quietSource = findQuietSource(
      [source({ source: 'apple_health', last_synced_at: stale })],
      NOW,
    );

    expect(quietSource).not.toBeNull();
    if (quietSource) {
      expect(formatLastSynced(quietSource.last_synced_at, NOW)).toBe('yesterday, 7:00 AM');
    }
  });

  it('returns null when nothing is quiet', () => {
    const sources: SourceStatus[] = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString() }),
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
      source({ source: 'apple_health', last_synced_at: NOW.toISOString() }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    // Reassign one connected source to be quiet for this scenario.
    sources[0] = source({ source: 'apple_health', last_synced_at: stale });
    expect(buildConnectedSummary(sources, NOW)).toBe('Apple Health · quiet — Strava · active');
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
      source({ source: 'apple_health', last_synced_at: NOW.toISOString() }),
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
