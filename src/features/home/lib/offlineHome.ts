/**
 * What Home shows with no connection (issue #49, design 25c), as a pure function so every case is
 * unit tested: connected, offline with today's saved copy, offline with nothing saved.
 *
 * Nothing here invents data. The wave only runs up to the saved time; the saved copy only counts
 * if it is for today.
 */

import { dayProgress } from '@/features/home/lib/dayProgress';
import type { HomeCache } from '@/features/home/lib/homeCache';

export type OfflineHomeView =
  | { offline: false }
  | {
      offline: true;
      /** Banner line. Design 25c copy when today is saved, just "No connection." when not. */
      bannerText: string;
      /** The "As of 2:14 PM" badge, or `null` when there is no saved day to be "as of". */
      asOfLabel: string | null;
      /** 0-1 share of the day the wave may draw; `null` means draw no wave at all. */
      waveProgress: number | null;
      /** Bottom axis of the Today card: "Morning", the saved time, "—". */
      axisLabels: [string, string, string] | null;
    };

/** `2:14 PM`, the clock format used throughout the design. */
export function formatClockTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

type Input = {
  isOnline: boolean;
  cache: HomeCache | null;
  /** Today as `YYYY-MM-DD`, same format as `HomeCache.date`. */
  today: string;
};

export function buildOfflineHomeView({ isOnline, cache, today }: Input): OfflineHomeView {
  if (isOnline) return { offline: false };

  if (!cache || cache.date !== today) {
    return {
      offline: true,
      bannerText: 'No connection.',
      asOfLabel: null,
      waveProgress: null,
      axisLabels: null,
    };
  }

  const savedAt = new Date(cache.savedAt);
  const time = formatClockTime(savedAt);
  return {
    offline: true,
    bannerText: `No connection. Today is cached from ${time}.`,
    asOfLabel: `As of ${time}`,
    waveProgress: dayProgress(savedAt),
    axisLabels: ['Morning', time, '—'],
  };
}
