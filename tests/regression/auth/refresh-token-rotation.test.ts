/**
 * Issue #172 — the backend rotates the refresh token on every `POST /users/token/refresh/`
 * (backend #106/#107): the response carries a new `refresh` alongside the new `access`, and a
 * refresh token is rejected once it has been used (`apps/users/api/views/auth.py:207-233`,
 * `TokenRefreshSerializer` at `apps/users/serializers.py:217-218`). `refreshAccessToken` in
 * `src/shared/api/client.ts` read only `data.access` and threw the new `data.refresh` away, so a
 * second refresh in the same session replayed the now-rejected first refresh token and signed the
 * user out. This locks in: the new refresh token is saved when the response includes one, the old
 * refresh token is kept when it doesn't (older backends), and a failed refresh still clears both
 * tokens.
 */

import { createApiClient } from '@/shared/api/client';
import type { AuthTokenStore } from '@/shared/api/authTokenStore';
import type { Transport, TransportResponse } from '@/shared/api/transport/types';

const config = { mode: 'live' as const, baseUrl: 'https://api.example.com/api/v1' };

function jsonResponse(status: number, body: unknown): TransportResponse {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function fakeTokenStore(initial: { access: string | null; refresh: string | null }) {
  let access = initial.access;
  let refresh = initial.refresh;
  const store: AuthTokenStore = {
    getAccessToken: async () => access,
    getRefreshToken: async () => refresh,
    setAccessToken: async (newAccess) => {
      access = newAccess;
    },
    setTokens: async (tokens) => {
      access = tokens.access;
      refresh = tokens.refresh;
    },
    clearTokens: async () => {
      access = null;
      refresh = null;
    },
  };
  return {
    store,
    get access() {
      return access;
    },
    get refresh() {
      return refresh;
    },
  };
}

describe('refreshAccessToken saves the rotated refresh token (issue #172)', () => {
  it('saves both the new access and new refresh token when the response includes a refresh', async () => {
    const tokenStore = fakeTokenStore({ access: 'old-access', refresh: 'old-refresh' });
    let refreshRequestBody: unknown = null;

    const transport: Transport = async (request) => {
      if (request.path === '/users/token/refresh/') {
        refreshRequestBody = request.body ? JSON.parse(request.body as string) : null;
        return jsonResponse(200, {
          success: true,
          data: { access: 'new-access', refresh: 'new-refresh' },
        });
      }
      // First call on the protected endpoint is unauthorized, forcing the refresh-and-retry path.
      return jsonResponse(401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
    };

    const client = createApiClient({ config, transport, tokenStore: tokenStore.store });

    await expect(client.get('/users/profile/')).rejects.toThrow();

    expect(refreshRequestBody).toEqual({ refresh: 'old-refresh' });
    expect(tokenStore.access).toBe('new-access');
    expect(tokenStore.refresh).toBe('new-refresh');
  });

  it('keeps the existing refresh token when the response has no refresh (older backend)', async () => {
    const tokenStore = fakeTokenStore({ access: 'old-access', refresh: 'old-refresh' });

    const transport: Transport = async (request) => {
      if (request.path === '/users/token/refresh/') {
        return jsonResponse(200, { success: true, data: { access: 'new-access' } });
      }
      return jsonResponse(401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
    };

    const client = createApiClient({ config, transport, tokenStore: tokenStore.store });

    await expect(client.get('/users/profile/')).rejects.toThrow();

    expect(tokenStore.access).toBe('new-access');
    expect(tokenStore.refresh).toBe('old-refresh');
  });

  it('clears both tokens when the refresh is rejected (reused/expired refresh token)', async () => {
    const tokenStore = fakeTokenStore({ access: 'old-access', refresh: 'used-refresh' });

    const transport: Transport = async (request) => {
      if (request.path === '/users/token/refresh/') {
        return jsonResponse(400, {
          success: false,
          error: { code: 'TOKEN_REFRESH_ERROR', message: 'Invalid refresh token' },
        });
      }
      return jsonResponse(401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
    };

    const client = createApiClient({ config, transport, tokenStore: tokenStore.store });

    await expect(client.get('/users/profile/')).rejects.toThrow();

    expect(tokenStore.access).toBeNull();
    expect(tokenStore.refresh).toBeNull();
  });

  it('two refreshes in a row each save their own new refresh token in turn', async () => {
    const tokenStore = fakeTokenStore({ access: 'access-0', refresh: 'refresh-0' });
    let refreshCount = 0;

    const transport: Transport = async (request) => {
      if (request.path === '/users/token/refresh/') {
        refreshCount += 1;
        return jsonResponse(200, {
          success: true,
          data: { access: `access-${refreshCount}`, refresh: `refresh-${refreshCount}` },
        });
      }
      return jsonResponse(401, { success: false, error: { code: 'TOKEN_EXPIRED' } });
    };

    const client = createApiClient({ config, transport, tokenStore: tokenStore.store });

    await expect(client.get('/users/profile/')).rejects.toThrow();
    expect(tokenStore.refresh).toBe('refresh-1');

    await expect(client.get('/users/profile/')).rejects.toThrow();
    expect(tokenStore.refresh).toBe('refresh-2');
    expect(refreshCount).toBe(2);
  });
});
