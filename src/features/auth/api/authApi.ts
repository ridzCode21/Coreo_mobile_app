import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import type { LoginFormValues, RegisterFormValues } from '@/features/auth/schemas';
import type { SessionTokens } from '@/features/auth/store/sessionStore';
import type { Gender } from '@/shared/types/user';

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function fieldErrorsFromRecord(value: unknown): Record<string, string[]> | null {
  if (!value || typeof value !== 'object') return null;

  const result: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isStringArray(entry)) result[key] = entry;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** `RegisterFormValues` plus the two optional fields `SaveScreen` derives from the onboarding
 * draft (D3 in onboarding-v2-flow-plan.md) rather than asks the user to type — never user-typed,
 * so they don't go through the Zod form resolver like the rest of `RegisterFormValues` does. */
export type RegisterRequestValues = RegisterFormValues & {
  dateOfBirth?: string;
  gender?: Gender;
};

/**
 * `POST /users/register/` (API_REFERENCE.md §3, Style A envelope) — backs the onboarding "Save
 * your core" step, for both the email path and the mocked Apple/Google buttons (those just supply
 * a generated email/name instead of a typed one — see `SaveScreen`). `auth: false` since there's
 * no session yet to attach a bearer token from.
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: (values: RegisterRequestValues) =>
      apiClient.post<RegisterEnvelope>(
        '/users/register/',
        {
          email: values.email,
          password: values.password,
          password_confirm: values.password,
          first_name: values.firstName,
          last_name: values.lastName,
          ...(values.dateOfBirth ? { date_of_birth: values.dateOfBirth } : {}),
          ...(values.gender ? { gender: values.gender } : {}),
        },
        { auth: false },
      ),
  });
}

/** Pulls DRF-style field errors out of a Style A validation error body — see API_REFERENCE.md
 * §2. Returns e.g. `{ email: ["User with this email already exists."] }`, or null if the error
 * isn't shaped that way (network/server errors, etc.). */
export function registerFieldErrors(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.details as
    | {
        error?: { details?: unknown };
        details?: unknown;
      }
    | undefined;
  return (
    fieldErrorsFromRecord(body?.error?.details) ??
    fieldErrorsFromRecord(body?.details) ??
    fieldErrorsFromRecord(body) ??
    null
  );
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.details as
    | {
        detail?: unknown;
        message?: unknown;
        error?: { message?: unknown; detail?: unknown };
      }
    | undefined;

  const message =
    (typeof body?.error?.message === 'string' && body.error.message) ||
    (typeof body?.error?.detail === 'string' && body.error.detail) ||
    (typeof body?.message === 'string' && body.message) ||
    (typeof body?.detail === 'string' && body.detail) ||
    error.message;

  return message || fallback;
}
