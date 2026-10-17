/**
 * Issue #40 — `useTrainingWeekQuery`/`useMarkSetDoneMutation` contract against
 * `GET/POST /users/me/training-week(/sets)/` (`apps/users/urls.py:38-39`). Pattern mirrors
 * `fitness-profile-api-contract.test.tsx`: `apiClient` mocked directly so this protects the hook's
 * own request/response wiring, independent of the mock-router test
 * (`training-week-mock.test.ts`) that protects the mock handler's business rules.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  trainingWeekKeys,
  useMarkSetDoneMutation,
  useTrainingWeekQuery,
} from '@/features/fitness/api/trainingWeekApi';
import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

const SESSION = {
  key: 'push',
  name: 'Push: chest, shoulders, arms',
  weekday: 'tuesday',
  date: '2026-10-20',
  status: 'today',
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 1,
  note: null,
  progression_note: null,
  lighter_note: null,
  exercises: [
    {
      key: 'dumbbell_bench_press',
      name: 'Dumbbell bench press',
      sets: 4,
      reps: 8,
      weight_kg: 22.5,
      superset: null,
      completed_sets: [],
    },
  ],
};

const FULL_RESPONSE = {
  training_week: {
    position: { week: 3, day: 2, label: 'Week 3 · Day 2' },
    status: 'in_progress',
    summary: 'Build muscle · dumbbells at home · 3 days · lower back protected',
    sessions: [SESSION],
    today: SESSION,
  },
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

describe('trainingWeek: useTrainingWeekQuery contract (GET /users/me/training-week/, #40)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /users/me/training-week/', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useTrainingWeekQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/users/me/training-week/');
  });

  it('returns the parsed payload unchanged (bare payload, no envelope unwrap)', async () => {
    mockGet.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useTrainingWeekQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(FULL_RESPONSE);
  });

  it('parses the incomplete-interview { training_week: null } response', async () => {
    mockGet.mockResolvedValue({ training_week: null });

    const { result } = renderHook(() => useTrainingWeekQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ training_week: null });
  });
});

describe('trainingWeek: useMarkSetDoneMutation contract (POST .../sets/, #40)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs the exact {session_key, exercise_key, set_number} body', async () => {
    mockPost.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useMarkSetDoneMutation(), { wrapper });
    result.current.mutate({
      session_key: 'push',
      exercise_key: 'dumbbell_bench_press',
      set_number: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/users/me/training-week/sets/', {
      session_key: 'push',
      exercise_key: 'dumbbell_bench_press',
      set_number: 1,
    });
  });

  it('writes the refreshed payload into the trainingWeekKeys.all cache entry on success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockPost.mockResolvedValue(FULL_RESPONSE);

    const { result } = renderHook(() => useMarkSetDoneMutation(), {
      wrapper: wrapperWithClient(client),
    });
    result.current.mutate({
      session_key: 'push',
      exercise_key: 'dumbbell_bench_press',
      set_number: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(trainingWeekKeys.all)).toEqual(FULL_RESPONSE);
  });

  it('surfaces a 400 detail message (e.g. "That set is not in this session.") as an ApiError', async () => {
    mockPost.mockRejectedValue(
      new ApiError('That request could not be validated.', 'validation', 400, {
        detail: 'That set is not in this session.',
      }),
    );

    const { result } = renderHook(() => useMarkSetDoneMutation(), { wrapper });
    result.current.mutate({
      session_key: 'push',
      exercise_key: 'dumbbell_bench_press',
      set_number: 99,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as ApiError;
    expect((error.details as { detail: string }).detail).toBe('That set is not in this session.');
  });
});
