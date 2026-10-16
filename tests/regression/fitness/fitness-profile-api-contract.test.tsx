/**
 * Issue #39 — `useFitnessProfileQuery`/`useUpdateFitnessProfileMutation` contract against
 * `GET/PUT /users/me/fitness-profile/` (API_REFERENCE.md:500-538). Pattern mirrors
 * `nutrition/usuals-query-contract.test.tsx`: `apiClient` mocked directly so this protects the
 * hook's own request/response wiring, independent of the mock-router test
 * (`fitness-profile-mock.test.ts`) that protects the mock handler's business rules.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  fitnessProfileKeys,
  useFitnessProfileQuery,
  useUpdateFitnessProfileMutation,
} from '@/features/fitness/api/fitnessProfileApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

const EMPTY_PROFILE = {
  fitness_interview_complete: false,
  fitness_goal: '',
  training_places: [],
  movement_note: '',
  sports: [],
  protected_areas: [],
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

describe('fitness: useFitnessProfileQuery contract (GET /users/me/fitness-profile/, #39)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/fitness-profile/', async () => {
    mockGet.mockResolvedValue(EMPTY_PROFILE);

    const { result } = renderHook(() => useFitnessProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/fitness-profile/');
  });

  it('returns the parsed profile', async () => {
    const full = {
      fitness_interview_complete: true,
      fitness_goal: 'build_muscle',
      training_places: ['home_dumbbells_band'],
      movement_note: 'Desk job, walk the dog twice a day.',
      sports: ['cricket'],
      protected_areas: ['lower_back'],
    };
    mockGet.mockResolvedValue(full);

    const { result } = renderHook(() => useFitnessProfileQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(full);
  });
});

describe('fitness: useUpdateFitnessProfileMutation contract (PUT /users/me/fitness-profile/, #39)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PUTs exactly the given partial patch', async () => {
    mockPut.mockResolvedValue({ ...EMPTY_PROFILE, fitness_goal: 'build_muscle' });

    const { result } = renderHook(() => useUpdateFitnessProfileMutation(), { wrapper });
    result.current.mutate({ fitness_goal: 'build_muscle' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith('/users/me/fitness-profile/', {
      fitness_goal: 'build_muscle',
    });
  });

  it('writes the response straight into the fitnessProfileKeys.all cache entry on success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const updated = { ...EMPTY_PROFILE, sports: ['cricket'] };
    mockPut.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateFitnessProfileMutation(), {
      wrapper: wrapperWithClient(client),
    });
    result.current.mutate({ sports: ['cricket'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(fitnessProfileKeys.all)).toEqual(updated);
  });

  it('propagates a rejected mutation (e.g. the mock/server 400) as an error, not a silent no-op', async () => {
    mockPut.mockRejectedValue(new Error('400'));

    const { result } = renderHook(() => useUpdateFitnessProfileMutation(), { wrapper });
    result.current.mutate({ sports: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
