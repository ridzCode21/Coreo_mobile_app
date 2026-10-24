import { DEVICE_SOURCES, type SourceStatus } from '@/features/home';

import { sourceLabels } from './profileCopy';

export const QUIET_AFTER_HOURS = 24;

const QUIET_AFTER_MS = QUIET_AFTER_HOURS * 60 * 60 * 1000;

function findSource(sources: readonly SourceStatus[], sourceName: SourceStatus['source']) {
  return sources.find((candidate) => candidate.source === sourceName);
}

export function isSourceQuiet(
  source: SourceStatus,
  now = new Date(),
): source is SourceStatus & { last_synced_at: string } {
  if (!source.connected) {
    return false;
  }

  if (source.last_synced_at === null) {
    return false;
  }

  if (source.source !== 'strava') {
    return source.status === 'quiet';
  }

  return now.getTime() - new Date(source.last_synced_at).getTime() >= QUIET_AFTER_MS;
}

export function findQuietSource(
  sources: readonly SourceStatus[],
  now = new Date(),
): (SourceStatus & { last_synced_at: string }) | null {
  for (const sourceName of DEVICE_SOURCES) {
    const source = findSource(sources, sourceName);
    if (source && isSourceQuiet(source, now)) {
      return source;
    }
  }

  return null;
}

export function buildConnectedSummary(
  sources: readonly SourceStatus[],
  now = new Date(),
): string | null {
  const summary = DEVICE_SOURCES.flatMap((sourceName) => {
    const source = findSource(sources, sourceName);
    if (!source?.connected) {
      return [];
    }

    return [`${sourceLabels[source.source]} · ${isSourceQuiet(source, now) ? 'quiet' : 'active'}`];
  });

  return summary.length ? summary.join(' — ') : null;
}

export function formatLastSynced(lastSyncedAt: string, now = new Date()): string {
  const date = new Date(lastSyncedAt);
  const dateDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayDifference = Math.round((today - dateDay) / (24 * 60 * 60 * 1000));
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  if (dayDifference === 0) {
    return `today, ${time}`;
  }
  if (dayDifference === 1) {
    return `yesterday, ${time}`;
  }

  return `${date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })}, ${time}`;
}

export function formatSleepDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function formatRecoveryValue(recovery: { score: number } | null): string {
  return recovery === null ? 'Unavailable today' : String(recovery.score);
}

export function reconnectRouteForSource(
  source: SourceStatus['source'],
): { kind: 'settings' } | { kind: 'navigate'; href: '/profile/manage-sources' } {
  return source === 'strava'
    ? { kind: 'navigate', href: '/profile/manage-sources' }
    : { kind: 'settings' };
}
