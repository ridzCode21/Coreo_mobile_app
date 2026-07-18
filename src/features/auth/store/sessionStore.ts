import { create } from 'zustand';

import { secureStorage, SECURE_STORAGE_KEYS } from '@/shared/lib/secureStorage';

type SessionStatus = 'checking' | 'signedOut' | 'signedIn';

type SessionState = {
  status: SessionStatus;
  /** Hydrates from SecureStore on app start — call once from the root layout. */
  bootstrap: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Auth session is global client state that isn't server-fetched data, so it lives in Zustand
 * rather than TanStack Query — see docs/architecture.md §3's state-management decision table.
 * The token itself is never held only in memory-readable state long-term; SecureStore is the
 * source of truth and this store just mirrors whether we have one.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',

  bootstrap: async () => {
    const token = await secureStorage.getItem(SECURE_STORAGE_KEYS.authToken);
    set({ status: token ? 'signedIn' : 'signedOut' });
  },

  signIn: async (token: string) => {
    await secureStorage.setItem(SECURE_STORAGE_KEYS.authToken, token);
    set({ status: 'signedIn' });
  },

  signOut: async () => {
    await secureStorage.deleteItem(SECURE_STORAGE_KEYS.authToken);
    set({ status: 'signedOut' });
  },
}));
