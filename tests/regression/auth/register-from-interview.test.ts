import { registerFormField, splitName } from '@/features/onboarding/lib/registerFromInterview';

/**
 * Issue #14 — 8e adds a real `passwordConfirm` field distinct from `password`. `registerFormField`
 * decides which rendered form field a server error attaches to.
 *
 * `buildMockSocialIdentity` (SaveScreen's old mocked-Google-via-`/users/register/` path) and its
 * coverage here were removed by issue #13: the Google button now calls the real
 * `POST /users/google/` instead (see `tests/regression/onboarding/save-screen-registration.test.tsx`
 * and `tests/regression/auth/google-sign-in-mock.test.ts`).
 */
describe('onboarding: registerFromInterview helpers (issue #14)', () => {
  describe('registerFormField', () => {
    it('maps the backend password_confirm error to the confirm-password form field', () => {
      expect(registerFormField('password_confirm')).toBe('passwordConfirm');
    });

    it('still maps email and password unchanged', () => {
      expect(registerFormField('email')).toBe('email');
      expect(registerFormField('password')).toBe('password');
    });

    it('no longer maps first_name/last_name (8e has no name inputs to attach an error to)', () => {
      expect(registerFormField('first_name')).toBeNull();
      expect(registerFormField('last_name')).toBeNull();
    });
  });

  describe('splitName (unchanged — still the only source of 8e/8a first/last name)', () => {
    it('splits a full name into first/last', () => {
      expect(splitName('Maya Chen')).toEqual({ firstName: 'Maya', lastName: 'Chen' });
    });

    it('defaults to "Friend" for an empty name', () => {
      expect(splitName('')).toEqual({ firstName: 'Friend', lastName: '' });
    });
  });
});
