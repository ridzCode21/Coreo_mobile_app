/**
 * Issue #41 — `useWellnessProfileQuery`/`useUpdateWellnessProfileMutation` contract against
 * `GET/PUT /users/me/wellness-profile/` (`apps/users/urls.py:35`, `profile.py:152-164`). Pattern
 * mirrors `fitness/fitness-profile-api-contract.test.tsx`: `apiClient` mocked directly so this
 * protects the hook's own request/response wiring, independent of the mock-router test
 * (`wellness-profile-mock.test.ts`).
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  wellnessProfileKeys,
  useWellnessProfileQuery,
  useUpdateWellnessProfileMutation,
} from '@/features/wellness/api/wellnessProfileApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

const EMPTY_PROFILE = {
  wellness_interview_complete: false,
  wellness_focus: '',
  nights_note: '',
  nights_tags: [],
  morning_first: '',
  what_helps: [],
  check_in_style: '',
  hide_numbers: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function wrapperWithClient(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('wellness: useWellnessProfileQuery contract (GET /users/me/wellness-profile/, #41)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/wellness-profile/', async () => {
    mockGet.mockResolvedValue(EMPTY_PROFILE);

    const { result } = renderHook(() => useWellnessProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/wellness-profile/');
  });

  it('returns the parsed profile', async () => {
    const full = {
      wellness_interview_complete: true,
      wellness_focus: 'racing_mind',
      nights_note: 'In bed by 11:30 but on the phone till 1.',
      nights_tags: ['Bed 11:30, phone till 1', 'Wakes ~4 AM'],
      morning_first: 'phone',
      what_helps: ['walks', 'chai'],
      check_in_style: 'step_in',
      hide_numbers: true,
    };
    mockGet.mockResolvedValue(full);

    const { result } = renderHook(() => useWellnessProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(full);
  });
});

describe('wellness: useUpdateWellnessProfileMutation contract (PUT /users/me/wellness-profile/, #41)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PUTs exactly the given partial patch', async () => {
    mockPut.mockResolvedValue({ ...EMPTY_PROFILE, wellness_focus: 'racing_mind' });

    const { result } = renderHook(() => useUpdateWellnessProfileMutation(), { wrapper });
    result.current.mutate({ wellness_focus: 'racing_mind' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith('/users/me/wellness-profile/', {
      wellness_focus: 'racing_mind',
    });
  });

  it('writes the response straight into the wellnessProfileKeys.all cache entry on success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const updated = { ...EMPTY_PROFILE, what_helps: ['walks'] };
    mockPut.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateWellnessProfileMutation(), {
      wrapper: wrapperWithClient(client),
    });
    result.current.mutate({ what_helps: ['walks'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(wellnessProfileKeys.all)).toEqual(updated);
  });

  it('propagates a rejected mutation (e.g. the mock/server 400) as an error, not a silent no-op', async () => {
    mockPut.mockRejectedValue(new Error('400'));

    const { result } = renderHook(() => useUpdateWellnessProfileMutation(), { wrapper });
    result.current.mutate({ what_helps: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
