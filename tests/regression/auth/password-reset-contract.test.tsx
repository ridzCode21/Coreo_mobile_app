/**
 * Issue #15 — no password reset flow existed. The real backend
 * (apps/users/api/views/password.py:21-45,48-85, apps/users/serializers.py:204-220) exposes:
 *   POST /users/password-reset/         { email }
 *   POST /users/password-reset/confirm/ { token, new_password, new_password_confirm }
 * Both are public (`AllowAny`, `authentication_classes([])`), so `auth: false` — there is no
 * session yet when requesting or confirming a reset. `password-reset/confirm` "does not log the
 * user in or issue JWT tokens" (API_REFERENCE.md §7), so the response never carries tokens and the
 * confirm mutation must not touch the session store. This protects the exact request bodies the
 * hooks send against that contract.
 */

import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import {
  isInvalidTokenError,
  passwordResetFieldErrors,
  useConfirmPasswordResetMutation,
  useRequestPasswordResetMutation,
} from '@/features/auth/api/authApi';

jest.mock('@/shared/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('auth: POST /users/password-reset/ contract (issue #15)', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({
      success: true,
      message: 'If the email exists, a password reset email has been sent',
    });
  });

  it('sends exactly { email }, unauthenticated', async () => {
    const { result } = renderHook(() => useRequestPasswordResetMutation(), { wrapper });

    result.current.mutate({ email: 'maya@example.com' });

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      '/users/password-reset/',
      { email: 'maya@example.com' },
      { auth: false },
    );
  });
});

describe('auth: POST /users/password-reset/confirm/ contract (issue #15)', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ success: true, message: 'Password reset successful' });
  });

  it('sends exactly { token, new_password, new_password_confirm }, unauthenticated', async () => {
    const { result } = renderHook(() => useConfirmPasswordResetMutation(), { wrapper });

    result.current.mutate({
      token: 'usr_1:abc-def',
      newPassword: 'quiet-harbor-42',
      newPasswordConfirm: 'quiet-harbor-42',
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      '/users/password-reset/confirm/',
      {
        token: 'usr_1:abc-def',
        new_password: 'quiet-harbor-42',
        new_password_confirm: 'quiet-harbor-42',
      },
      { auth: false },
    );
  });

  // The route never signs the user in (API_REFERENCE.md §7) — the response carries no tokens, so
  // there is nothing for the mutation to hand the session store even if it wanted to.
  it('resolves to a tokenless envelope', async () => {
    const { result } = renderHook(() => useConfirmPasswordResetMutation(), { wrapper });

    result.current.mutate({
      token: 'usr_1:abc-def',
      newPassword: 'quiet-harbor-42',
      newPasswordConfirm: 'quiet-harbor-42',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true, message: 'Password reset successful' });
  });
});

describe('auth: password-reset error mapping (issue #15)', () => {
  it('recognizes only the backend INVALID_TOKEN error code', () => {
    const invalidToken = new ApiError('invalid token', 'validation', 400, {
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'invalid token' },
    });
    const otherValidation = new ApiError('invalid data', 'validation', 400, {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'invalid data' },
    });

    expect(isInvalidTokenError(invalidToken)).toBe(true);
    expect(isInvalidTokenError(otherValidation)).toBe(false);
    expect(isInvalidTokenError(ApiError.network())).toBe(false);
    expect(isInvalidTokenError(new Error('plain error'))).toBe(false);
  });

  it('extracts new_password_confirm details and otherwise returns null', () => {
    const mismatch = new ApiError('invalid data', 'validation', 400, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: { new_password_confirm: ['Passwords do not match.'] },
      },
    });
    const noFieldDetails = new ApiError('invalid token', 'validation', 400, {
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'invalid token' },
    });

    expect(passwordResetFieldErrors(mismatch)).toEqual({
      new_password_confirm: ['Passwords do not match.'],
    });
    expect(passwordResetFieldErrors(noFieldDetails)).toBeNull();
    expect(passwordResetFieldErrors(new Error('plain error'))).toBeNull();
  });
});
