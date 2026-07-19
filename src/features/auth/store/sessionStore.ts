import { create } from 'zustand';

import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';

type SessionStatus = 'checking' | 'signedOut' | 'signedIn';

export type SessionTokens = {
  access: string;
  refresh: string;
};

type SessionState = {
  status: SessionStatus;
  /** Hydrates from SecureStore on app start — call once from the root layout. */
  bootstrap: () => Promise<void>;
  signIn: (tokens: SessionTokens) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Auth session is global client state that isn't server-fetched data, so it lives in Zustand
 * rather than TanStack Query — see docs/architecture.md §3's state-management decision table.
 * Tokens are never held only in memory-readable state long-term; SecureStore is the source of
 * truth and this store just mirrors whether we have a valid session.
 *
 * Holds both `access` and `refresh` per API_REFERENCE.md §1 (60min/7day lifetimes) — the
 * 401→refresh→retry interceptor on `shared/api/client.ts` is still Phase 2 scope
 * (implementation-plan.md §3); this store just has somewhere real to put both tokens now that
 * register (8a, mock-backed) issues them.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',

  bootstrap: async () => {
    const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.authToken);
    set({ status: token ? 'signedIn' : 'signedOut' });
  },

  signIn: async ({ access, refresh }: SessionTokens) => {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.authToken, access);
    await secureStorage.setItem(SECURE_STORAGE_KEYS.refreshToken, refresh);
    set({ status: 'signedIn' });
  },

  signOut: async () => {
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.authToken);
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.refreshToken);
    set({ status: 'signedOut' });
  },
}));
