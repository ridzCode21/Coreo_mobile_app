/**
 * Issue #176 — `useProfileQuery`/`useUpdateProfileMutation` contract against
 * `GET/PUT /users/profile/` and `/users/profile/update/`. Backend truth checked in the snapshot:
 * `apps/users/api/views/profile.py:41-74` (`user_profile`, `user_profile_update`), serializers
 * `UserDetailSerializer` (`apps/users/serializers.py:583-623`, always returns `email`, `first_name`,
 * `last_name`, `timezone`, `created_at`) and `UserProfileUpdateSerializer`
 * (`apps/users/serializers.py:510-523`, accepts `first_name, last_name, phone, date_of_birth,
 * gender, timezone`, no min-length validator on `first_name` — a backend gap plan.md Decision #5
 * says the app enforces client-side instead). Pattern mirrors
 * `fitness/fitness-profile-api-contract.test.tsx`: `apiClient` mocked directly so this protects the
 * hooks' own request/response wiring, independent of the mock-router handler.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  profileKeys,
  useProfileQuery,
  useUpdateProfileMutation,
} from '@/features/auth/api/profileApi';
import { apiClient } from '@/shared/api/client';

jest.mock('@/shared/api/client', () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

const BACKEND_USER = {
  first_name: 'Shubham',
  last_name: 'Rao',
  email: 'shubham@example.com',
  calibration_day: 3,
  calibration_complete: false,
  wave: null,
  timezone: 'America/New_York',
  created_at: '2026-03-02T00:00:00Z',
};

function wrapperWithClient(client: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('auth: useProfileQuery schema (GET /users/profile/, UserDetailSerializer fields, #176)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses email, last_name and timezone instead of dropping them', async () => {
    mockGet.mockResolvedValue({ success: true, data: { user: BACKEND_USER } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useProfileQuery(), { wrapper: wrapperWithClient(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.email).toBe('shubham@example.com');
    expect(result.current.data?.last_name).toBe('Rao');
    expect(result.current.data?.timezone).toBe('America/New_York');
  });
});

describe('auth: useUpdateProfileMutation (PUT /users/profile/update/, #176)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends exactly { first_name, last_name } — never phone/date_of_birth/gender/timezone', async () => {
    mockPut.mockResolvedValue({
      success: true,
      data: { user: { ...BACKEND_USER, first_name: 'Sam', last_name: 'Rao' } },
      message: 'Profile updated successfully',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateProfileMutation(), {
      wrapper: wrapperWithClient(client),
    });

    result.current.mutate({ first_name: 'Sam', last_name: 'Rao' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith('/users/profile/update/', {
      first_name: 'Sam',
      last_name: 'Rao',
    });
  });

  it('writes the updated user into the profileKeys.all cache on success', async () => {
    mockPut.mockResolvedValue({
      success: true,
      data: { user: { ...BACKEND_USER, first_name: 'Sam' } },
      message: 'Profile updated successfully',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateProfileMutation(), {
      wrapper: wrapperWithClient(client),
    });

    result.current.mutate({ first_name: 'Sam', last_name: 'Rao' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((client.getQueryData(profileKeys.all) as { first_name: string }).first_name).toBe('Sam');
  });

  it('accepts a successful response when its human-readable message changes', async () => {
    mockPut.mockResolvedValue({
      success: true,
      data: { user: { ...BACKEND_USER, first_name: 'Sam' } },
      message: 'Your profile was saved.',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateProfileMutation(), {
      wrapper: wrapperWithClient(client),
    });

    result.current.mutate({ first_name: 'Sam', last_name: 'Rao' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
