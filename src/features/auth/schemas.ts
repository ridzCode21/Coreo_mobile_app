import { z } from 'zod';

/**
 * Validation source of truth for the login form — React Hook Form's resolver reads this, so the
 * schema (not scattered field-level rules) is what defines "valid" here. See
 * docs/architecture.md §3 and docs/coding-standards.md.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
});

export type RequestPasswordResetFormValues = z.infer<typeof requestPasswordResetSchema>;

const credentialsShape = {
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string().min(1, 'Confirm password is required'),
};

function passwordsMatch<T extends { password: string; passwordConfirm: string }>(values: T) {
  return values.password === values.passwordConfirm;
}

const passwordMismatch = {
  message: 'Passwords do not match.',
  path: ['passwordConfirm'],
};

const newPasswordShape = {
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  newPasswordConfirm: z.string().min(1, 'Confirm password is required'),
};

function newPasswordsMatch<T extends { newPassword: string; newPasswordConfirm: string }>(
  values: T,
) {
  return values.newPassword === values.newPasswordConfirm;
}

export const newPasswordSchema = z.object(newPasswordShape).refine(newPasswordsMatch, {
  message: passwordMismatch.message,
  path: ['newPasswordConfirm'],
});

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>;

export const accountCredentialsSchema = z
  .object(credentialsShape)
  .refine(passwordsMatch, passwordMismatch);

export type AccountCredentialsFormValues = z.infer<typeof accountCredentialsSchema>;

/**
 * Mirrors `POST /users/register/` (API_REFERENCE.md §3) — the Create account screen reached from
 * onboarding's Create account step (8e). `passwordConfirm` remains a separate value through the
 * request boundary because the backend requires and independently validates `password_confirm`.
 */
export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().optional(),
    ...credentialsShape,
  })
  .refine(passwordsMatch, passwordMismatch);

export type RegisterFormValues = z.infer<typeof registerSchema>;
