/**
 * Issue #177 — Account: change password. `changePasswordSchema` is the client-side gate before a
 * `POST /users/password-change/` request is ever made (plan.md Decision log #3): it must catch a
 * new/confirm mismatch locally with the exact design copy "These don't match." (design file
 * `19d · Password states`, "Passwords don't match"), and must never trim a password value (unlike
 * name fields) since a password is sent exactly as typed.
 */

import { changePasswordSchema } from '@/features/profile/schemas';

describe('profile: changePasswordSchema (plan.md Decision log #3)', () => {
  it('requires a non-empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'longenough1',
      newPasswordConfirm: 'longenough1',
    });
    expect(result.success).toBe(false);
  });

  it('requires at least 8 characters for the new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'short1',
      newPasswordConfirm: 'short1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a mismatched confirmation with the exact design copy, on the confirm field', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'longenough1',
      newPasswordConfirm: 'longenough2',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.includes('newPasswordConfirm'));
      expect(issue?.message).toBe("These don't match.");
    }
  });

  it('accepts a matching, long-enough password pair', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'longenough1',
      newPasswordConfirm: 'longenough1',
    });
    expect(result.success).toBe(true);
  });

  it('never trims password values (unlike name fields)', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: '  longenough1  ',
      newPasswordConfirm: '  longenough1  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newPassword).toBe('  longenough1  ');
    }
  });
});
