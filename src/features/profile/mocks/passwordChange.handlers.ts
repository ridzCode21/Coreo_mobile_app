import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function unauthorized() {
  return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
}

function passwordRules(password: string, email: string, firstName: string): string[] {
  const errors: string[] = [];
  if (['12345678', 'password', 'password1', 'qwerty123'].includes(password.toLowerCase())) {
    errors.push('This password is too common.');
  }
  if (/^\d+$/.test(password)) errors.push('This password is entirely numeric.');
  const normalized = password.toLowerCase();
  if (
    [email.split('@')[0], firstName].some(
      (value) => value.length > 0 && normalized.includes(value.toLowerCase()),
    )
  ) {
    errors.push('The password is too similar to the email or name.');
  }
  return errors;
}

/** Matches PasswordChangeSerializer and password_change in the backend snapshot. */
registerMock('POST', '/users/password-change/', (request) => {
  const user = requireMockUser(request);
  if (!user) return unauthorized();

  const body = (request.body ?? {}) as Record<string, unknown>;
  const currentPassword = asString(body.current_password);
  const newPassword = asString(body.new_password);
  const newPasswordConfirm = asString(body.new_password_confirm);
  const details: Record<string, string[]> = {};

  if (!currentPassword) details.current_password = ['This field may not be blank.'];
  else if (currentPassword !== user.password) {
    details.current_password = ['Current password is incorrect.'];
  }
  if (!newPassword) details.new_password = ['This field may not be blank.'];
  else if (newPassword.length < 8) {
    details.new_password = ['Ensure this field has at least 8 characters.'];
  }
  if (!newPasswordConfirm) details.new_password_confirm = ['This field may not be blank.'];

  if (Object.keys(details).length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid password change data', details),
    };
  }
  if (newPassword !== newPasswordConfirm) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid password change data', {
        new_password_confirm: ['Passwords do not match.'],
      }),
    };
  }

  const ruleErrors = passwordRules(newPassword, user.email, user.first_name);
  if (ruleErrors.length > 0) {
    return {
      status: 400,
      body: styleAError('VALIDATION_ERROR', 'Invalid password change data', {
        non_field_errors: ruleErrors,
      }),
    };
  }

  user.password = newPassword;
  user.updated_at = new Date().toISOString();
  return { status: 200, body: { success: true, message: 'Password changed successfully' } };
});
