/**
 * Issue #180, acceptance criterion 4: "After signing in as someone else no previous name, draft,
 * pillars or cache is visible." `signOut()` previously only removed `profileKeys.all` from the
 * TanStack Query cache (leaving nutrition/fitness/wellness/home data from the outgoing user still
 * cached) and never reset the onboarding draft at all (plan.md Decision 9-10).
 */

import type { PropsWithChildren } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/features/auth/store/sessionStore';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { queryClient } from '@/shared/api/queryClient';

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

jest.mock('@/shared/api/authTokenStore', () => ({
  secureAuthTokenStore: {
    clearTokens: jest.fn().mockResolvedValue(undefined),
    getAccessToken: jest.fn().mockResolvedValue(null),
    setTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('auth: sign out clears the whole query cache and the onboarding draft (issue #180)', () => {
  it('clears cached data for a query unrelated to the profile, not just profileKeys', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['unrelated-feature-data'],
          queryFn: () => Promise.resolve({ belongsTo: 'the-outgoing-user' }),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['unrelated-feature-data'])).toBeDefined();

    await useSessionStore.getState().signOut();

    expect(queryClient.getQueryData(['unrelated-feature-data'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('resets the onboarding draft back to defaults', async () => {
    useOnboardingStore.getState().update({ name: 'Maya' });
    useOnboardingStore.getState().togglePillar('diet');
    useOnboardingStore.getState().completeStep('name');
    expect(useOnboardingStore.getState().draft.name).toBe('Maya');

    await useSessionStore.getState().signOut();

    expect(useOnboardingStore.getState().draft.name).toBe('');
    expect(useOnboardingStore.getState().draft.pillars).toEqual([]);
    expect(useOnboardingStore.getState().lastCompletedStep).toBeNull();
  });
});
