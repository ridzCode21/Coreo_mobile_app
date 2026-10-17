import { profileKeys } from '@/features/auth/api/profileApi';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';
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

  it('clears the stored pillar selection on sign-out (issue #51)', async () => {
    usePillarSelectionStore.setState({ activePillars: ['diet', 'fitness'], hasHydrated: true });

    await useSessionStore.getState().signOut();

    expect(usePillarSelectionStore.getState().activePillars).toEqual([]);
  });
});
