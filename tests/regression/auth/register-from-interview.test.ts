import {
  buildMockSocialIdentity,
  registerFormField,
  splitName,
} from '@/features/onboarding/lib/registerFromInterview';
import { ONBOARDING_DEFAULTS } from '@/features/onboarding/store/onboardingStore';

/**
 * Issue #14 — 8e adds a real `passwordConfirm` field distinct from `password`. These two helpers
 * sit on either side of that change: `registerFormField` decides which rendered form field a
 * server error attaches to, and `buildMockSocialIdentity` (SaveScreen's mocked Google path, which
 * has no confirm-password UI at all) must still produce a type-complete `RegisterRequestValues`.
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

  describe('buildMockSocialIdentity', () => {
    it('includes a passwordConfirm equal to the generated password', () => {
      const identity = buildMockSocialIdentity('google', {
        ...ONBOARDING_DEFAULTS,
        name: 'Maya Chen',
        goal: 'lose_weight',
        pillars: ['fitness'],
      });
      expect(identity.passwordConfirm).toBe(identity.password);
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
