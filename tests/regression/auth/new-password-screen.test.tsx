/**
 * Issue #15 — 8d "Set a new password." design-spec.md covers four markup blocks that are all the
 * same screen in different states: the form, the form with errors, and success. `INVALID_TOKEN`
 * (apps/users/api/views/password.py:73-83) maps to the banner; a client-side password mismatch
 * (newPasswordSchema, mirroring apps/users/serializers.py:215-217) maps to the field message. The
 * route "does not log the user in or issue JWT tokens" (API_REFERENCE.md §7) — success must not
 * call the session store's `signIn`.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import NewPasswordScreen from '@/features/auth/screens/NewPasswordScreen';
import { ApiError } from '@/shared/api/errors';
import { colors } from '@/shared/theme/tokens';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockConfirmReset = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useConfirmPasswordResetMutation: () => ({ mutate: mockConfirmReset, isPending: false }),
  };
});

jest.mock('@/features/auth/store/sessionStore', () => ({
  useSessionStore: (selector: (state: { signIn: typeof mockSignIn }) => unknown) =>
    selector({ signIn: mockSignIn }),
}));

function invalidTokenError() {
  return new ApiError('Password reset token is invalid or expired', 'validation', 400, {
    success: false,
    error: { code: 'INVALID_TOKEN', message: 'Password reset token is invalid or expired' },
  });
}

function fillForm({
  token = 'usr_1:abc-def',
  newPassword = 'brand-new-harbor-7',
  newPasswordConfirm = 'brand-new-harbor-7',
}: { token?: string; newPassword?: string; newPasswordConfirm?: string } = {}) {
  fireEvent.changeText(screen.getByLabelText('Reset token'), token);
  fireEvent.changeText(screen.getByLabelText('New password'), newPassword);
  fireEvent.changeText(screen.getByLabelText('Confirm password'), newPasswordConfirm);
}

describe('auth: Set a new password screen (8d, issue #15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the design copy and fields in order: title, token, hint, new/confirm password, button', () => {
    render(<NewPasswordScreen />);

    expect(screen.getByText('Set a new')).toBeTruthy();
    expect(screen.getByText('password.')).toBeTruthy();
    expect(screen.getByText('Reset token')).toBeTruthy();
    expect(screen.getByPlaceholderText('Paste it here')).toBeTruthy();
    expect(screen.getByText("It's in the email, on the line that starts with token:")).toBeTruthy();
    expect(screen.getByText('New password')).toBeTruthy();
    expect(
      screen.getByText(
        'At least 8 characters. Not just numbers, not too common, and not too similar to your email or name.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Confirm password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeTruthy();
  });

  it('uses the design-specified 13px vertical padding for all password-reset fields', () => {
    render(<NewPasswordScreen />);

    const fieldCards = screen.getAllByTestId('glass-card-content');
    expect(fieldCards).toHaveLength(3);
    fieldCards.forEach((fieldCard) => {
      expect(fieldCard).toHaveStyle({ paddingVertical: 13, paddingHorizontal: 18 });
    });
  });

  it('submits exactly { token, newPassword, newPasswordConfirm } mapped to the request shape', async () => {
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(mockConfirmReset).toHaveBeenCalled());
    expect(mockConfirmReset.mock.calls[0][0]).toEqual({
      token: 'usr_1:abc-def',
      newPassword: 'brand-new-harbor-7',
      newPasswordConfirm: 'brand-new-harbor-7',
    });
  });

  it('shows "Passwords do not match." under confirm password without calling the API', async () => {
    render(<NewPasswordScreen />);
    fillForm({ newPasswordConfirm: 'typo-oops-99' });
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    const message = await screen.findByText('Passwords do not match.');
    expect(StyleSheet.flatten(message.props.style).color).toBe(colors.attention);
    expect(mockConfirmReset).not.toHaveBeenCalled();
  });

  it('shows the invalid-token banner with "Request a new token", in attention not red', async () => {
    mockConfirmReset.mockImplementation((_values, handlers) =>
      handlers.onError(invalidTokenError()),
    );
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    const banner = await screen.findByText(
      "That token didn't work. It may have expired or already been used — request a new one.",
    );
    expect(StyleSheet.flatten(banner.props.style).color).toBe(colors.attention);
    expect(screen.getByRole('link', { name: 'Request a new token' })).toBeTruthy();
  });

  it('hides the reset-token field and its hint after an invalid-token response', async () => {
    mockConfirmReset.mockImplementation((_values, handlers) =>
      handlers.onError(invalidTokenError()),
    );
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    await screen.findByRole('link', { name: 'Request a new token' });
    expect(screen.queryByLabelText('Reset token')).toBeNull();
    expect(screen.queryByText("It's in the email, on the line that starts with token:")).toBeNull();
    expect(screen.getByLabelText('New password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
    const fieldCards = screen.getAllByTestId('glass-card-content');
    expect(fieldCards).toHaveLength(2);
    fieldCards.forEach((fieldCard) => {
      expect(fieldCard).toHaveStyle({ paddingVertical: 13, paddingHorizontal: 18 });
    });
  });

  it('"Request a new token" navigates back to the reset-password screen', async () => {
    mockConfirmReset.mockImplementation((_values, handlers) =>
      handlers.onError(invalidTokenError()),
    );
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    fireEvent.press(await screen.findByRole('link', { name: 'Request a new token' }));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/reset-password');
  });

  it('shows the success state and does not sign the user in automatically', async () => {
    mockConfirmReset.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ success: true, message: 'Password reset successful' }),
    );
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Password reset')).toBeTruthy();
    expect(screen.getByText('Sign in with your new password.')).toBeTruthy();
    expect(screen.getByText('You are not signed in automatically.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('"Sign in" on the success state goes to the sign-in screen', async () => {
    mockConfirmReset.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ success: true, message: 'Password reset successful' }),
    );
    render(<NewPasswordScreen />);
    fillForm();
    fireEvent.press(screen.getByRole('button', { name: 'Reset password' }));

    fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
