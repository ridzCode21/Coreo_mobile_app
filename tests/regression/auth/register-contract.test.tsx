/**
 * Issue #8 — signup only ever sent email/password/name. The real `POST /users/register/`
 * (apps/users/serializers.py:23-103 `UserRegistrationSerializer`, confirmed against
 * apps/users/api/views/auth.py:29-47 `user_register`) requires `goal` and `active_pillars`, and,
 * only when `diet` is one of the chosen pillars, `age`, `height_cm`, `weight_kg` and `gender`
 * (apps/users/serializers.py:94-101). `last_name` is optional (serializers.py:55,69-72). This
 * protects the exact request body `useRegisterMutation` sends for each pillar combination, that no
 * invented `date_of_birth` is sent (the backend derives it from `age` itself —
 * apps/users/services/onboarding.py:51-57), and that the six backend interview goals
 * (apps/users/services/onboarding.py:5-14 `INTERVIEW_GOALS`) are the only ones this module exposes.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { useRegisterMutation, type RegisterRequestValues } from '@/features/auth/api/authApi';
import { registerSchema } from '@/features/auth/schemas';
import { INTERVIEW_GOALS } from '@/shared/types/user';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function values(overrides: Partial<RegisterRequestValues> = {}): RegisterRequestValues {
  return {
    firstName: 'Maya',
    lastName: undefined,
    email: 'maya@example.com',
    password: 'quiet-harbor-42',
    goal: 'lose_weight',
    activePillars: ['diet'],
    age: 34,
    heightCm: 178,
    weightKg: 74,
    gender: 'female',
    ...overrides,
  };
}

describe('auth: POST /users/register/ contract (issue #8)', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ success: true, data: { user: {}, tokens: {} } });
  });

  it('exposes exactly the six interview goals accepted by registration', () => {
    expect([...INTERVIEW_GOALS]).toEqual([
      'get_stronger',
      'sleep_better',
      'less_stress',
      'lose_weight',
      'more_energy',
      'eat_healthier',
    ]);
  });

  it('accepts an omitted last name and still requires the rest of the form', () => {
    expect(
      registerSchema.safeParse({
        firstName: 'Maya',
        lastName: '',
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
      }).success,
    ).toBe(true);

    expect(
      registerSchema.safeParse({
        firstName: '',
        lastName: '',
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
      }).success,
    ).toBe(false);
  });

  it('sends the exact Diet-only body, using age instead of an invented date of birth', async () => {
    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    result.current.mutate(values());

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      '/users/register/',
      {
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        password_confirm: 'quiet-harbor-42',
        first_name: 'Maya',
        goal: 'lose_weight',
        active_pillars: ['diet'],
        age: 34,
        height_cm: 178,
        weight_kg: 74,
        gender: 'female',
      },
      { auth: false },
    );
  });

  it('omits Diet-only body fields for a Fitness-only registration', async () => {
    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    result.current.mutate(values({ goal: 'get_stronger', activePillars: ['fitness'] }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      '/users/register/',
      {
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        password_confirm: 'quiet-harbor-42',
        first_name: 'Maya',
        goal: 'get_stronger',
        active_pillars: ['fitness'],
      },
      { auth: false },
    );
  });

  it('sends all three pillars, Diet body fields, and a supplied last name without extras', async () => {
    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    result.current.mutate(
      values({
        lastName: 'Doe',
        goal: 'more_energy',
        activePillars: ['diet', 'fitness', 'wellness'],
      }),
    );

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      '/users/register/',
      {
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        password_confirm: 'quiet-harbor-42',
        first_name: 'Maya',
        last_name: 'Doe',
        goal: 'more_energy',
        active_pillars: ['diet', 'fitness', 'wellness'],
        age: 34,
        height_cm: 178,
        weight_kg: 74,
        gender: 'female',
      },
      { auth: false },
    );
  });
});
