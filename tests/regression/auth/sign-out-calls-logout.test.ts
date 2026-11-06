/**
 * Issue #180 — sign-out must call `POST /users/logout/` (backend: apps/users/api/views/auth.py:
 * 240-245, apps/users/services/auth_service.py:28-32) with the current access token before
 * clearing it, best-effort: a failure or a timeout must never block sign-out, and it must never be
 * attempted at all while offline (plan.md Decision 7). Acceptance criterion 2: online, the server
 * session is revoked (the old token returns 401) — checked here against the mock's own blacklist
 * (src/features/auth/mocks/handlers.ts:451-468), the same check the mock logout/refresh handlers
 * use internally.
 */

import '@/shared/api/mock/registerAllMocks';
import { __resetMockDbForTests, mockDb } from '@/shared/api/mock/db';
import { issueTokenPair, verifyMockToken } from '@/shared/api/mock/tokens';
import { secureAuthTokenStore } from '@/shared/api/authTokenStore';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { useSessionStore } from '@/features/auth/store/sessionStore';

async function signIn() {
  const user = {
    id: 'u1',
    email: 'maya@example.com',
    password: 'unused',
    first_name: 'Maya',
    last_name: 'Chen',
    phone: null,
    date_of_birth: null,
    gender: null,
    timezone: 'UTC',
    is_premium: false,
    email_verified: true,
    phone_verified: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  mockDb.users.push(user);
  const tokens = issueTokenPair(user);
  await secureAuthTokenStore.setTokens(tokens);
  return tokens;
}

describe('auth: sign out calls POST /users/logout/ (issue #180)', () => {
  beforeEach(() => {
    __resetMockDbForTests();
    useConnectivityStore.getState().setSimulatedOffline(false);
  });

  it('blacklists the access token when signing out while online', async () => {
    const tokens = await signIn();
    await useSessionStore.getState().signOut();

    expect(verifyMockToken(tokens.access, 'access')).toBeNull();
  });

  it('completes and clears tokens even though it never attempted the call while offline', async () => {
    const tokens = await signIn();
    useConnectivityStore.getState().setSimulatedOffline(true);

    await useSessionStore.getState().signOut();

    expect(await secureAuthTokenStore.getAccessToken()).toBeNull();
    // Never attempted offline, so the mock never blacklists it — proves the call was skipped,
    // not merely swallowed after failing.
    expect(verifyMockToken(tokens.access, 'access')).not.toBeNull();

    useConnectivityStore.getState().setSimulatedOffline(false);
  });

  it('a logout call that errors never blocks sign-out from completing', async () => {
    await signIn();
    // An already-cleared token makes the mock respond 401, simulating a failed server call.
    await secureAuthTokenStore.clearTokens();

    await expect(useSessionStore.getState().signOut()).resolves.toBeUndefined();
    expect(useSessionStore.getState().status).toBe('signedOut');
  });
});
