import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import type { LoginFormValues, RegisterFormValues } from '@/features/auth/schemas';
import type { SessionTokens } from '@/features/auth/store/sessionStore';

type LoginResponse = {
  success: true;
  data: { user: MockPublicUser; tokens: SessionTokens };
};

/**
 * `POST /users/login/` (API_REFERENCE.md §3, Style A envelope). The standalone login route is
 * not part of the designed onboarding path yet, but keeping this hook contract-real means it can
 * be mounted later without changing the API layer.
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: (values: LoginFormValues) =>
      apiClient.post<LoginResponse>('/users/login/', values, { auth: false }),
  });
}

export type MockPublicUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  [key: string]: unknown;
};

type RegisterEnvelope = {
  success: true;
  data: { user: MockPublicUser; tokens: SessionTokens };
};

/**
 * `POST /users/register/` (API_REFERENCE.md §3, Style A envelope) — backs the onboarding "Save
 * your core" step (8a), for both the email path and the mocked Apple/Google buttons (those just
 * supply a generated email/name instead of a typed one — see `SaveScreen`). `auth: false` since
 * there's no session yet to attach a bearer token from.
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      apiClient.post<RegisterEnvelope>(
        '/users/register/',
        {
          email: values.email,
          password: values.password,
          password_confirm: values.password,
          first_name: values.firstName,
          last_name: values.lastName,
        },
        { auth: false },
      ),
  });
}

/** Pulls DRF-style field errors out of a Style A validation error body — see API_REFERENCE.md
 * §2. Returns e.g. `{ email: ["User with this email already exists."] }`, or null if the error
 * isn't shaped that way (network/server errors, etc.). */
export function registerFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof ApiError) || error.kind !== 'validation') return null;
  const body = error.details as { error?: { details?: Record<string, string[]> } } | undefined;
  return body?.error?.details ?? null;
}
