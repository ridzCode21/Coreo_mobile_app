import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/features/auth/screens/LoginScreen';
import { ApiError } from '@/shared/api/errors';
import { colors, componentSizes, radii } from '@/shared/theme/tokens';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLoginMutate = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useLoginMutation: () => ({ mutate: mockLoginMutate, isPending: false }),
  };
});

jest.mock('@/features/auth/store/sessionStore', () => ({
  useSessionStore: (selector: (state: { signIn: typeof mockSignIn }) => unknown) =>
    selector({ signIn: mockSignIn }),
}));

function fillCredentials(email = 'maya@example.com', password = 'quiet-harbor-42') {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
}

function invalidCredentialsError() {
  return new ApiError('Invalid email or password', 'unauthorized', 401, {
    success: false,
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
}

/**
 * Issue #14 — 8b "Sign in with email." replaces the unstyled placeholder at
 * `src/app/(auth)/login.tsx` (title "Coreo", no labelled fields, no "Forgot your password?", no
 * error shown for wrong credentials) with the real design screen, extracted into
 * `src/features/auth/screens/LoginScreen.tsx` per `react-native-architecture`'s own documented
 * TODO for this exact file.
 */
describe('auth: Sign in with email screen (8b, issue #14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the design copy and fields in order: title, Email, Password, button, link', () => {
    render(<LoginScreen />);

    expect(screen.getAllByText('Sign in')).toHaveLength(2);
    expect(screen.getByText('with email.')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toBeTruthy();
  });

  it('never shows placeholder/scaffolding copy ("Coreo" title, no fields)', () => {
    render(<LoginScreen />);
    expect(screen.queryByText('Coreo')).toBeNull();
  });

  it('styles the button solid ink, pill radius, 54px height — matching 8e exactly', () => {
    render(<LoginScreen />);
    const button = screen.getByRole('button', { name: 'Sign in' });
    const flat = StyleSheet.flatten(button.props.style);
    expect(flat.backgroundColor).toBe(colors.ink);
    expect(flat.borderRadius).toBe(radii.pill);
    expect(flat.height).toBe(componentSizes.authButtonHeight);
  });

  it('"Forgot your password?" navigates to the reset placeholder, not a dead end', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'Forgot your password?' }));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('signs in and enters the app on success', async () => {
    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ access: 'a', refresh: 'r' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
  });

  it('shows a calm, non-red message for wrong credentials (401 INVALID_CREDENTIALS)', async () => {
    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onError(invalidCredentialsError()),
    );
    render(<LoginScreen />);
    fillCredentials();
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    const message = await screen.findByText('Invalid email or password');
    expect(message).toBeTruthy();
    const flat = StyleSheet.flatten(message.props.style);
    expect(flat.color).toBe(colors.attention);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
