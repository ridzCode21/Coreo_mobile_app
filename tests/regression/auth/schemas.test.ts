import {
  accountCredentialsSchema,
  newPasswordSchema,
  registerSchema,
  requestPasswordResetSchema,
} from '@/features/auth/schemas';

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

/**
 * Issue #15 — 8c "Reset your password" (email form) and 8d "Set a new password" (token + new
 * password form) add two new client-side schemas. `password-reset/confirm`
 * (apps/users/serializers.py:208-220 `PasswordResetConfirmSerializer`) checks the match before
 * strength, so the client schema mirrors that with the same "Passwords do not match." copy used
 * everywhere else in this file (design-spec.md 8d-errors line 172).
 */
describe('auth: password reset schemas (issue #15)', () => {
  describe('requestPasswordResetSchema (8c email field)', () => {
    it('accepts a valid email', () => {
      expect(requestPasswordResetSchema.safeParse({ email: 'maya@example.com' }).success).toBe(
        true,
      );
    });

    it('rejects a missing email', () => {
      expect(requestPasswordResetSchema.safeParse({ email: '' }).success).toBe(false);
    });

    it('rejects a malformed email', () => {
      expect(requestPasswordResetSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });
  });

  describe('newPasswordSchema (8d token/newPassword/newPasswordConfirm fields)', () => {
    function values(overrides: Record<string, string> = {}) {
      return {
        token: 'usr_1:abc-def',
        newPassword: 'quiet-harbor-42',
        newPasswordConfirm: 'quiet-harbor-42',
        ...overrides,
      };
    }

    it('accepts a matching new password and a non-empty token', () => {
      expect(newPasswordSchema.safeParse(values()).success).toBe(true);
    });

    it('rejects a blank reset token', () => {
      expect(newPasswordSchema.safeParse(values({ token: '' })).success).toBe(false);
    });

    it('rejects a mismatched confirmation, attaching the exact design copy to newPasswordConfirm', () => {
      const result = newPasswordSchema.safeParse(values({ newPasswordConfirm: 'something-else' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (entry) => entry.path.join('.') === 'newPasswordConfirm',
        );
        expect(issue?.message).toBe('Passwords do not match.');
      }
    });

    it('enforces the 8-character minimum on the new password', () => {
      expect(
        newPasswordSchema.safeParse(values({ newPassword: 'short', newPasswordConfirm: 'short' }))
          .success,
      ).toBe(false);
    });
  });
});
