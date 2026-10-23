import { create } from 'zustand';

import { secureAuthTokenStore } from '@/shared/api/authTokenStore';
import { queryClient } from '@/shared/api/queryClient';
import { runBeforeSessionEnd, runSessionCleanup } from '@/shared/lib/sessionCleanup';
import { profileKeys } from '@/features/auth/api/profileApi';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';

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
    const token = await secureAuthTokenStore.getAccessToken();
    set({ status: token ? 'signedIn' : 'signedOut' });
  },

  signIn: async ({ access, refresh }: SessionTokens) => {
    await secureAuthTokenStore.setTokens({ access, refresh });
    set({ status: 'signedIn' });
  },

  signOut: async () => {
    // Steps that need the session (like deleting this phone's push registration) go first.
    await runBeforeSessionEnd();
    await secureAuthTokenStore.clearTokens();
    queryClient.removeQueries({ queryKey: profileKeys.all });
    usePillarSelectionStore.getState().clear();
    // Saved offline copies are personal data on unencrypted storage: never outlive the session.
    await runSessionCleanup();
    set({ status: 'signedOut' });
  },
}));
