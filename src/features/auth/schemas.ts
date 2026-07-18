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
