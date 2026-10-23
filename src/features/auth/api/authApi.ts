import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import type {
  LoginFormValues,
  NewPasswordFormValues,
  RegisterFormValues,
  RequestPasswordResetFormValues,
} from '@/features/auth/schemas';
import type { SessionTokens } from '@/features/auth/store/sessionStore';
import type { ActivePillar, Gender, InterviewGoal } from '@/shared/types/user';

type LoginResponse = {
  success: true;
  data: { user: MockPublicUser; tokens: SessionTokens };
};

type PasswordResetEnvelope = {
  success: true;
  message: string;
};

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: (values: RequestPasswordResetFormValues) =>
      apiClient.post<PasswordResetEnvelope>('/users/password-reset/', values, { auth: false }),
  });
}

export function useConfirmPasswordResetMutation() {
  return useMutation({
    mutationFn: (values: NewPasswordFormValues) =>
      apiClient.post<PasswordResetEnvelope>(
        '/users/password-reset/confirm/',
        {
          token: values.token,
          new_password: values.newPassword,
          new_password_confirm: values.newPasswordConfirm,
        },
        { auth: false },
      ),
  });
}

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

/** `RegisterFormValues` plus the interview answers collected before account creation. */
export type RegisterRequestValues = RegisterFormValues & {
  goal: InterviewGoal;
  activePillars: ActivePillar[];
  age?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
};

/** Interview answers sent with a Google ID token to `POST /users/google/`. */
export type GoogleSignInRequestValues = {
  identityToken: string;
  firstName: string;
  lastName: string;
  goal: InterviewGoal;
  activePillars: ActivePillar[];
  age?: number;
  heightCm?: number;
  weightKg?: number;
  gender?: Gender;
};

/**
 * `POST /users/register/` (API_REFERENCE.md §3, Style A envelope) — backs the onboarding "Save
 * your core" flow, for the CreateAccountScreen email path and the mocked Google button (which
 * supplies a generated email/name — see `SaveScreen`). `auth: false` since there's
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
          password_confirm: values.passwordConfirm,
          first_name: values.firstName,
          ...(values.lastName ? { last_name: values.lastName } : {}),
          goal: values.goal,
          active_pillars: values.activePillars,
          ...(values.activePillars.includes('diet')
            ? {
                age: values.age,
                height_cm: values.heightCm,
                weight_kg: values.weightKg,
                gender: values.gender,
              }
            : {}),
        },
        { auth: false },
      ),
  });
}

/** `POST /users/google/` — a public provider endpoint with the same token envelope as register. */
export function useGoogleSignInMutation() {
  return useMutation({
    mutationFn: (values: GoogleSignInRequestValues) =>
      apiClient.post<RegisterEnvelope>(
        '/users/google/',
        {
          identity_token: values.identityToken,
          first_name: values.firstName,
          last_name: values.lastName,
          goal: values.goal,
          active_pillars: values.activePillars,
          ...(values.activePillars.includes('diet')
            ? {
                age: values.age,
                height_cm: values.heightCm,
                weight_kg: values.weightKg,
                gender: values.gender,
              }
            : {}),
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

function apiErrorBody(
  error: unknown,
): { error?: { code?: unknown; details?: unknown }; details?: unknown } | undefined {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return undefined;
  }
  return error.details as { error?: { code?: unknown; details?: unknown }; details?: unknown };
}

export function isInvalidTokenError(error: unknown): boolean {
  return apiErrorBody(error)?.error?.code === 'INVALID_TOKEN';
}

export function passwordResetFieldErrors(error: unknown): Record<string, string[]> | null {
  const body = apiErrorBody(error);
  return (
    fieldErrorsFromRecord(body?.error?.details) ?? fieldErrorsFromRecord(body?.details) ?? null
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
