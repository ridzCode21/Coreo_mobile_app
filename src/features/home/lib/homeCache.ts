/**
 * The saved copy of "today" that Home shows when the phone has no connection (issue #49, design
 * 25c). Deliberately tiny: only which day it is for and when it was last fetched. No meals, notes,
 * profile data or tokens, because this goes to the phone's unencrypted storage. It is checked with
 * Zod on the way back in and cleared at logout.
 */

import { z } from 'zod';

import { storage, STORAGE_KEYS } from '@/shared/lib/storage';

const HOME_CACHE_VERSION = 1;

export const homeCacheSchema = z.object({
  version: z.literal(HOME_CACHE_VERSION),
  /** `YYYY-MM-DD` the cached summary is for. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** ISO time of the last successful fetch: the "2:14 PM" in "cached from 2:14 PM". */
  savedAt: z.iso.datetime(),
});
export type HomeCache = z.infer<typeof homeCacheSchema>;

export function buildHomeCache(date: string, savedAt: Date): HomeCache {
  return { version: HOME_CACHE_VERSION, date, savedAt: savedAt.toISOString() };
}

/** Returns the cache if what came back from disk is valid, otherwise `null` (treated as no cache). */
export function parseHomeCache(raw: unknown): HomeCache | null {
  const parsed = homeCacheSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function readHomeCache(): Promise<HomeCache | null> {
  try {
    return parseHomeCache(await storage.getJSON<unknown>(STORAGE_KEYS.homeCache));
  } catch {
    return null;
  }
}

export async function writeHomeCache(cache: HomeCache): Promise<void> {
  await storage.setJSON(STORAGE_KEYS.homeCache, cache);
}

export async function clearHomeCacheStorage(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.homeCache);
}
