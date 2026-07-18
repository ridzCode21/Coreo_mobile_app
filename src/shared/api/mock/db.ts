/**
 * In-memory mock backend store — resets on every app reload/restart (fine for a mock; nothing
 * here is meant to be durable). Seeded and extended per-feature as real handlers are added (see
 * `features/<feature>/mocks`). Shapes should mirror the real objects in API_REFERENCE.md exactly
 * so swapping to the live API later is a no-op for feature code.
 */

export type MockUser = {
  id: string;
  email: string;
  /** Mock-only — never returned to the client, matches password storage semantics of the real API. */
  password: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  timezone: string;
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
};

type MockDb = {
  users: MockUser[];
};

function createEmptyDb(): MockDb {
  return { users: [] };
}

export const mockDb: MockDb = createEmptyDb();

/** Test-only / dev-tool escape hatch — wipes all mock data back to empty. */
export function __resetMockDbForTests(): void {
  mockDb.users = [];
}
