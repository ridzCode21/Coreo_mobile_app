import { accountCredentialsSchema, registerSchema } from '@/features/auth/schemas';

/**
 * Issue #14 — 8e "Create your account" adds a real, separate confirm-password field. The real
 * backend (`apps/users/serializers.py:26,81-83` `UserRegistrationSerializer`) requires
 * `password_confirm` as its own field and 400s `{"password_confirm": "Passwords do not match."}`
 * when it differs from `password` (API_REFERENCE.md §3: "`password_confirm` must match."). The
 * previous frontend copied `password` into `password_confirm` at the call site, so a mismatch
 * could never be produced or shown — these schemas are what now make that state reachable and
 * validated client-side before ever hitting the network.
 */
describe('auth: password-confirmation schemas (issue #14)', () => {
  describe('accountCredentialsSchema (8e form fields: email/password/passwordConfirm)', () => {
    it('accepts matching passwords', () => {
      const result = accountCredentialsSchema.safeParse({
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        passwordConfirm: 'quiet-harbor-42',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a password/confirm mismatch, attaching the error to passwordConfirm', () => {
      const result = accountCredentialsSchema.safeParse({
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        passwordConfirm: 'something-else',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (entry) => entry.path.join('.') === 'passwordConfirm',
        );
        expect(issue?.message).toBe('Passwords do not match.');
      }
    });

    it('still enforces the 8-character minimum on password', () => {
      const result = accountCredentialsSchema.safeParse({
        email: 'maya@example.com',
        password: 'short',
        passwordConfirm: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('requires a valid email', () => {
      const result = accountCredentialsSchema.safeParse({
        email: 'not-an-email',
        password: 'quiet-harbor-42',
        passwordConfirm: 'quiet-harbor-42',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema (full backend-shaped contract)', () => {
    it('accepts a valid body including a matching passwordConfirm', () => {
      const result = registerSchema.safeParse({
        firstName: 'Maya',
        lastName: '',
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        passwordConfirm: 'quiet-harbor-42',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a mismatched passwordConfirm', () => {
      const result = registerSchema.safeParse({
        firstName: 'Maya',
        lastName: '',
        email: 'maya@example.com',
        password: 'quiet-harbor-42',
        passwordConfirm: 'different-value',
      });
      expect(result.success).toBe(false);
    });
  });
});
