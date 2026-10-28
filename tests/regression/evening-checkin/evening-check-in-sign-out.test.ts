/**
 * Issue #46 - the evening recap and mood are personal data: signing out removes the cached
 * check-in from the query cache.
 */

import { eveningCheckInKeys } from '@/features/evening-checkin/api/eveningCheckInApi';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { queryClient } from '@/shared/api/queryClient';

jest.mock('@/shared/api/authTokenStore', () => ({
  secureAuthTokenStore: {
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn().mockResolvedValue(null),
    setTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('evening check-in: sign out clears the cache (#46)', () => {
  it('removes the cached ritual', async () => {
    queryClient.setQueryData(eveningCheckInKeys.all, { closed: false, recap: ['7,904 steps'] });
    expect(queryClient.getQueryData(eveningCheckInKeys.all)).toBeDefined();

    await useSessionStore.getState().signOut();

    expect(queryClient.getQueryData(eveningCheckInKeys.all)).toBeUndefined();
  });
});
