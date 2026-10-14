/**
 * Issue #15 — 8c "Reset your password." replaces the PARTIAL placeholder built for issue #14
 * (`ForgotPasswordScreen`, now retired — see `forgot-password-screen.test.tsx` removal in this
 * issue's plan) now that the backend dependency (vipin4250/Self_dev#9) is closed. Design copy and
 * order: design-spec.md "8c Reset your password" (initial) and "8c Reset your password · sent".
 * `password-reset` always 200s the same message whether or not the address has an account
 * (apps/users/api/views/password.py:38-45) — the UI must not imply otherwise.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ResetPasswordScreen from '@/features/auth/screens/ResetPasswordScreen';

const mockPush = jest.fn();
const mockRequestReset = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useRequestPasswordResetMutation: () => ({ mutate: mockRequestReset, isPending: false }),
  };
});

function fillEmail(email = 'maya@example.com') {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
}

function succeed() {
  mockRequestReset.mockImplementation((_values, handlers) =>
    handlers.onSuccess({
      success: true,
      message: 'If the email exists, a password reset email has been sent',
    }),
  );
}

describe('auth: Reset your password screen (8c, issue #15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the design copy and fields in order: title, body, Email, button', () => {
    render(<ResetPasswordScreen />);

    expect(screen.getByText('Reset your')).toBeTruthy();
    expect(screen.getByText('password.')).toBeTruthy();
    expect(
      screen.getByText("Tell us the email on your account. We'll send a reset token."),
    ).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send reset email' })).toBeTruthy();
  });

  it('submits exactly the entered email', async () => {
    render(<ResetPasswordScreen />);
    fillEmail('maya@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));

    await waitFor(() => expect(mockRequestReset).toHaveBeenCalled());
    expect(mockRequestReset.mock.calls[0][0]).toEqual({ email: 'maya@example.com' });
  });

  it('shows the sent-state copy on success and hides the form', async () => {
    succeed();
    render(<ResetPasswordScreen />);
    fillEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));

    expect(await screen.findByText('Check your')).toBeTruthy();
    expect(screen.getByText('inbox.')).toBeTruthy();
    expect(
      screen.getByText(
        'If that email has a Coreo account, a reset token is on its way. It expires in 1 hour.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enter the token' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Send it again' })).toBeTruthy();
    expect(screen.queryByPlaceholderText('you@example.com')).toBeNull();
  });

  it('never implies whether the address actually has an account', async () => {
    succeed();
    render(<ResetPasswordScreen />);
    fillEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));
    await screen.findByText('Check your');

    expect(screen.queryByText(/account exists/i)).toBeNull();
    expect(screen.queryByText(/no account/i)).toBeNull();
    expect(screen.queryByText(/does not exist/i)).toBeNull();
  });

  it('"Enter the token" navigates to the new-password screen', async () => {
    succeed();
    render(<ResetPasswordScreen />);
    fillEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));

    fireEvent.press(await screen.findByRole('button', { name: 'Enter the token' }));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/new-password');
  });

  it('"Send it again" resubmits the same email', async () => {
    succeed();
    render(<ResetPasswordScreen />);
    fillEmail('maya@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));
    await screen.findByText('Check your');
    mockRequestReset.mockClear();

    fireEvent.press(screen.getByRole('link', { name: 'Send it again' }));

    await waitFor(() => expect(mockRequestReset).toHaveBeenCalled());
    expect(mockRequestReset.mock.calls[0][0]).toEqual({ email: 'maya@example.com' });
  });

  it('shows a client-side validation message for an invalid email without calling the API', async () => {
    render(<ResetPasswordScreen />);
    fillEmail('not-an-email');
    fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));

    expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    expect(mockRequestReset).not.toHaveBeenCalled();
  });
});
