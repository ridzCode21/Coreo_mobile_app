import { profileKeys } from '@/features/auth/api/profileApi';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { queryClient } from '@/shared/api/queryClient';

describe('auth: profile cache lifecycle (issue #17)', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('removes the signed-in user profile from the query cache on sign-out', async () => {
    queryClient.setQueryData(profileKeys.all, { first_name: 'Asha' });

    await useSessionStore.getState().signOut();

    expect(queryClient.getQueryData(profileKeys.all)).toBeUndefined();
  });
});
