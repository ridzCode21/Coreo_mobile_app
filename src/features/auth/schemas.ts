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

/**
 * Mirrors `POST /users/register/` (API_REFERENCE.md §3) — the "Use email instead" path on the
 * onboarding "Save your core" step (8a). `password_confirm` isn't a separate field in that UI (the
 * design doesn't show one); it's set equal to `password` at the call site instead of duplicating
 * the input, which is a UI simplification, not a contract deviation — the mock still receives and
 * validates a real `password_confirm`.
 */
export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
