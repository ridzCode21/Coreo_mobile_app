import { fireEvent, render, screen } from '@testing-library/react-native';

import CreateAccountScreen from '@/features/onboarding/screens/CreateAccountScreen';
import { ApiError } from '@/shared/api/errors';

/**
 * Issue #166 — "Weak-password signup shows only 'Invalid registration data'". The backend's 400
 * response for `POST /users/register/` already carries the real reason (apps/users/api/views/
 * auth.py:38-49: `{ success: false, error: { code, message, details: serializer.errors } }`), but
 * `CreateAccountScreen` only attached a field error for keys `registerFormField` recognised, and
 * fell back to the generic `error.message` ("Invalid registration data") banner otherwise. A weak
 * password's reason arrives under `non_field_errors` (see
 * tests/regression/auth/register-from-interview.test.ts and
 * tests/regression/auth/register-mock-weak-password.test.ts for why), which wasn't mapped — so it
 * fell straight to the banner. This file locks the fix in at the screen level.
 */

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRegisterMutate = jest.fn();
const mockLoginMutate = jest.fn();
const mockSignIn = jest.fn();
const mockSetActivePillars = jest.fn();
const mockResetOnboarding = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useRegisterMutation: () => ({ mutate: mockRegisterMutate, isPending: false }),
    useLoginMutation: () => ({ mutate: mockLoginMutate, isPending: false }),
  };
});

jest.mock('@/features/auth/store/sessionStore', () => ({
  useSessionStore: (selector: (state: { signIn: typeof mockSignIn }) => unknown) =>
    selector({ signIn: mockSignIn }),
}));

jest.mock('@/features/auth/store/pillarSelectionStore', () => ({
  usePillarSelectionStore: (
    selector: (state: { setActivePillars: typeof mockSetActivePillars }) => unknown,
  ) => selector({ setActivePillars: mockSetActivePillars }),
}));

jest.mock('@/features/onboarding/store/onboardingStore', () => ({
  useOnboardingStore: (
    selector: (state: {
      draft: { name: string; goal: string; pillars: string[] };
      reset: typeof mockResetOnboarding;
    }) => unknown,
  ) =>
    selector({
      draft: { name: 'Maya Chen', goal: 'get_stronger', pillars: ['fitness'] },
      reset: mockResetOnboarding,
    }),
}));

function fillForm(password = '12345678') {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
  fireEvent.changeText(screen.getByPlaceholderText('Confirm password'), password);
}

function submit() {
  fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
}

function weakPasswordError() {
  return new ApiError('That request could not be validated.', 'validation', 400, {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid registration data',
      details: { non_field_errors: ['This password is entirely numeric.'] },
    },
  });
}

function duplicateEmailError() {
  return new ApiError('That request could not be validated.', 'validation', 400, {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid registration data',
      details: { email: ['User with this email already exists.'] },
    },
  });
}

describe('onboarding: CreateAccountScreen server error messages (issue #166)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the backend reason for a weak (all-digit) password without a generic banner', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(weakPasswordError()),
    );
    render(<CreateAccountScreen />);
    fillForm('12345678');
    submit();

    await screen.findByText('This password is entirely numeric.');
    expect(screen.queryByText('Invalid registration data')).toBeNull();
    expect(
      screen.queryByText("Something went wrong saving your core. Let's try again."),
    ).toBeNull();
  });

  it('shows its own message for a duplicate email (falls back to the existing-email sign-in attempt)', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(duplicateEmailError()),
    );
    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onError(new ApiError('Invalid email or password', 'unauthorized', 401)),
    );
    render(<CreateAccountScreen />);
    fillForm('quiet-harbor-42');
    submit();

    await screen.findByText(
      'That email already exists. Use its password, or choose another email.',
    );
    expect(screen.queryByText('Invalid registration data')).toBeNull();
  });

  it('never writes the submitted password to the console while handling a weak-password error', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(weakPasswordError()),
    );
    render(<CreateAccountScreen />);
    fillForm('12345678');
    submit();

    await screen.findByText('This password is entirely numeric.');
    for (const spy of [logSpy, warnSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        expect(call.join(' ')).not.toContain('12345678');
      }
    }
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
