/**
 * In-memory mock backend store — resets on every app reload/restart (fine for a mock; nothing
 * here is meant to be durable). Seeded and extended per-feature as real handlers are added (see
 * `features/<feature>/mocks`). Shapes should mirror the real objects in API_REFERENCE.md exactly
 * so swapping to the live API later is a no-op for feature code.
 */

import type { DietProfile } from '@/shared/types/dietProfile';
import type { Gender } from '@/shared/types/user';
import type { FoodEntry, FoodItem } from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';

export type MockUser = {
  id: string;
  email: string;
  /** Mock-only — never returned to the client, matches password storage semantics of the real API. */
  password: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  timezone: string;
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
};

type MockDb = {
  users: MockUser[];
  /** Keyed by user id — one diet profile per user, seeded lazily on first GET/PUT (see
   * `features/onboarding/mocks/dietProfile.handlers.ts`). */
  dietProfiles: Record<string, DietProfile>;
  /** All logged food entries (all users); handlers filter by the authed user + date. §8. */
  foodEntries: FoodEntry[];
  /** Recomputed daily aggregates, keyed `${userId}:${date}`. §10. */
  dailyLogs: Record<string, DailyLog>;
  /** Seeded food database backing search + barcode lookup (see nutrition `mocks/fixtures.ts`). §8. */
  foodItems: FoodItem[];
  /** AI-photo usage counter, keyed `${userId}:${date}`, enforcing the 10/day free limit. §8/§16. */
  photoQuotaByUserDate: Record<string, number>;
  /** Monotonic id source for created food entries. */
  nextFoodEntryId: number;
};

function createEmptyDb(): MockDb {
  return {
    users: [],
    dietProfiles: {},
    foodEntries: [],
    dailyLogs: {},
    foodItems: [],
    photoQuotaByUserDate: {},
    nextFoodEntryId: 1,
  };
}

export const mockDb: MockDb = createEmptyDb();

/** Test-only / dev-tool escape hatch — wipes all mock data back to empty. */
export function __resetMockDbForTests(): void {
  mockDb.users = [];
  mockDb.dietProfiles = {};
  mockDb.foodEntries = [];
  mockDb.dailyLogs = {};
  mockDb.foodItems = [];
  mockDb.photoQuotaByUserDate = {};
  mockDb.nextFoodEntryId = 1;
}
