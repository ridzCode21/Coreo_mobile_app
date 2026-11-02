import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/features/auth/screens/LoginScreen';
import CreateAccountScreen from '@/features/onboarding/screens/CreateAccountScreen';
import { NETWORK_ERROR_MESSAGE } from '@/features/auth/api/authApi';
import { ApiError } from '@/shared/api/errors';
import { colors } from '@/shared/theme/tokens';

/**
 * Issue #167 — "Server down shows a raw Java error and the server address". Tested on the
 * emulator with the backend stopped, sign-in and signup showed
 * `fetch failed: java.io.IOException… http://localhost:8000/...` instead of a plain message.
 * `ApiError.network(cause)` (src/shared/api/errors.ts:33-35) already marks the error
 * `kind: 'network'`; this suite locks the fix in at the screen level: a fixed, non-technical
 * banner plus a "Try again" action that resubmits, for both LoginScreen and CreateAccountScreen.
 */

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLoginMutate = jest.fn();
const mockRegisterMutate = jest.fn();
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
    useLoginMutation: () => ({ mutate: mockLoginMutate, isPending: false }),
    useRegisterMutation: () => ({ mutate: mockRegisterMutate, isPending: false }),
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

function networkError() {
  return ApiError.network(
    new TypeError(
      'fetch failed: java.io.IOException: Failed to connect to localhost/127.0.0.1:8000',
    ),
  );
}

describe('LoginScreen — server unreachable (issue #167)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the plain network message with no exception name or URL, and a Try again action', async () => {
    mockLoginMutate.mockImplementation((_values, handlers) => handlers.onError(networkError()));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'quiet-harbor-42');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    const message = await screen.findByText(NETWORK_ERROR_MESSAGE);
    expect(message).toBeTruthy();
    expect(screen.queryByText(/java\.io|exception|localhost|https?:\/\//i)).toBeNull();
    const flat = StyleSheet.flatten(message.props.style);
    expect(flat.color).toBe(colors.attention);

    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('Try again resubmits the form and succeeds once the server is back', async () => {
    mockLoginMutate.mockImplementation((_values, handlers) => handlers.onError(networkError()));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'quiet-harbor-42');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText(NETWORK_ERROR_MESSAGE);

    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ access: 'a', refresh: 'r' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
  });

  it('does not show a Try again action for a non-network error', async () => {
    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onError(new ApiError('Invalid email or password', 'unauthorized', 401)),
    );
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'quiet-harbor-42');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('Invalid email or password');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});

describe('CreateAccountScreen — server unreachable (issue #167)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function fillForm(password = 'quiet-harbor-42') {
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
    fireEvent.changeText(screen.getByPlaceholderText('Confirm password'), password);
  }

  it('shows the plain network message with no exception name or URL, and a Try again action', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) => handlers.onError(networkError()));
    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    const message = await screen.findByText(NETWORK_ERROR_MESSAGE);
    expect(message).toBeTruthy();
    expect(screen.queryByText(/java\.io|exception|localhost|https?:\/\//i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('Try again resubmits the same form values', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) => handlers.onError(networkError()));
    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText(NETWORK_ERROR_MESSAGE);

    mockRegisterMutate.mockClear();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(mockRegisterMutate).toHaveBeenCalledTimes(1));
    const [submittedValues] = mockRegisterMutate.mock.calls[0];
    expect(submittedValues).toMatchObject({ email: 'maya@example.com' });
  });

  it('does not show a Try again action for a validation error', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(
        new ApiError('That request could not be validated.', 'validation', 400, {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid registration data', details: {} },
        }),
      ),
    );
    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await screen.findByText('Invalid registration data');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
