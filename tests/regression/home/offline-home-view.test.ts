/**
 * Issue #49 (design 25c) — the offline Home view model, and the saved copy of today it relies on.
 * Nothing is invented: no saved copy for today means no "cached from" claim and no wave.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/shared/lib/storage';
import {
  buildHomeCache,
  clearHomeCacheStorage,
  parseHomeCache,
  readHomeCache,
  writeHomeCache,
} from '@/features/home/lib/homeCache';
import { buildOfflineHomeView, formatClockTime } from '@/features/home/lib/offlineHome';

const TODAY = '2026-07-07';
// Local time on purpose: the view formats in the device's clock, like the design's "2:14 PM".
const savedAt = new Date(2026, 6, 7, 14, 14);

describe('home: offline view model (issue #49, design 25c)', () => {
  it('formats the clock like the design', () => {
    expect(formatClockTime(new Date(2026, 6, 7, 14, 14))).toBe('2:14 PM');
    expect(formatClockTime(new Date(2026, 6, 7, 0, 5))).toBe('12:05 AM');
    expect(formatClockTime(new Date(2026, 6, 7, 12, 0))).toBe('12:00 PM');
    expect(formatClockTime(new Date(2026, 6, 7, 9, 3))).toBe('9:03 AM');
  });

  it('is not offline at all while connected', () => {
    const cache = buildHomeCache(TODAY, savedAt);
    expect(buildOfflineHomeView({ isOnline: true, cache, today: TODAY })).toEqual({
      offline: false,
    });
  });

  it('offline with today saved: design 25c copy, "As of" badge, axis, and a wave that stops at the saved time', () => {
    const view = buildOfflineHomeView({
      isOnline: false,
      cache: buildHomeCache(TODAY, savedAt),
      today: TODAY,
    });
    expect(view).toEqual({
      offline: true,
      bannerText: 'No connection. Today is cached from 2:14 PM.',
      asOfLabel: 'As of 2:14 PM',
      waveProgress: (14 * 60 + 14) / (24 * 60),
      axisLabels: ['Morning', '2:14 PM', '—'],
    });
  });

  it('offline with nothing saved (first launch offline): only "No connection.", no wave, no axis, no "as of"', () => {
    const view = buildOfflineHomeView({ isOnline: false, cache: null, today: TODAY });
    expect(view).toEqual({
      offline: true,
      bannerText: 'No connection.',
      asOfLabel: null,
      waveProgress: null,
      axisLabels: null,
    });
  });

  it("treats yesterday's saved copy as no copy instead of calling it today", () => {
    const view = buildOfflineHomeView({
      isOnline: false,
      cache: buildHomeCache('2026-07-06', savedAt),
      today: TODAY,
    });
    expect(view).toMatchObject({ offline: true, asOfLabel: null, waveProgress: null });
  });
});

describe('home: saved copy of today (issue #49)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps only the day and the save time, nothing personal', () => {
    expect(Object.keys(buildHomeCache(TODAY, savedAt)).sort()).toEqual([
      'date',
      'savedAt',
      'version',
    ]);
  });

  it('round-trips through disk', async () => {
    const cache = buildHomeCache(TODAY, savedAt);
    await writeHomeCache(cache);
    expect(await readHomeCache()).toEqual(cache);
  });

  it('rejects data that fails validation (wrong version, bad date, junk) as no cache', async () => {
    const good = buildHomeCache(TODAY, savedAt);
    expect(parseHomeCache({ ...good, version: 2 })).toBeNull();
    expect(parseHomeCache({ ...good, date: 'yesterday' })).toBeNull();
    expect(parseHomeCache({ ...good, savedAt: 'noon' })).toBeNull();
    expect(parseHomeCache('junk')).toBeNull();
    expect(parseHomeCache(null)).toBeNull();

    await AsyncStorage.setItem(STORAGE_KEYS.homeCache, JSON.stringify({ ...good, version: 9 }));
    expect(await readHomeCache()).toBeNull();
    await AsyncStorage.setItem(STORAGE_KEYS.homeCache, '{broken');
    expect(await readHomeCache()).toBeNull();
  });

  it('is removable (logout)', async () => {
    await writeHomeCache(buildHomeCache(TODAY, savedAt));
    await clearHomeCacheStorage();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.homeCache)).toBeNull();
  });
});
