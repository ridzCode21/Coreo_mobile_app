/**
 * Issue #177 — Account: change password with the real error messages. Covers the Password section
 * added to `AccountScreen` (design file `19d Account`, ~2802-2817, and `19d · Password states`,
 * ~2996-3034 — see design-spec.md and plan.md "Design requirements"). Follows the harness pattern
 * from `account-screen-identity.test.tsx`: the profile query and the name-update mutation are
 * mocked so this file can focus on the password section alone; the password mutation is mocked at
 * the hook boundary (`@/features/profile/api/passwordApi`), not the network, per `tests/README.md`.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { ApiError } from '@/shared/api/errors';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

const baseUser = {
  first_name: 'Shubham',
  last_name: '',
  email: 'shubham@example.com',
  timezone: 'America/New_York',
  created_at: '2026-03-02T00:00:00Z',
};

let mockProfileState: {
  data: typeof baseUser | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: jest.Mock;
};
const mockNameMutate = jest.fn();

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => mockProfileState,
  useUpdateProfileMutation: () => ({ mutate: mockNameMutate, isPending: false }),
  useSessionStore: { getState: () => ({ signOut: jest.fn() }) },
}));

const mockChangePasswordMutate = jest.fn();
let mockChangePasswordState: { mutate: jest.Mock; isPending: boolean };

jest.mock('@/features/profile/api/passwordApi', () => ({
  useChangePasswordMutation: () => mockChangePasswordState,
}));

function setUser(overrides: Partial<typeof baseUser> = {}) {
  mockProfileState = {
    data: { ...baseUser, ...overrides },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
}

function fillPasswordForm({
  current = 'oldpassword',
  next = 'newlongpass1',
  confirm = 'newlongpass1',
}: { current?: string; next?: string; confirm?: string } = {}) {
  fireEvent.changeText(screen.getByLabelText('Current password'), current);
  fireEvent.changeText(screen.getByLabelText('New password'), next);
  fireEvent.changeText(screen.getByLabelText('Confirm new password'), confirm);
}

beforeEach(() => {
  jest.clearAllMocks();
  setUser();
  mockChangePasswordState = { mutate: mockChangePasswordMutate, isPending: false };
  act(() => {
    useConnectivityStore.setState({ isOnline: true, networkOnline: true, simulatedOffline: false });
  });
});

describe('profile: AccountScreen Password section layout (design-spec "19d Account")', () => {
  it('shows the Password eyebrow, fields in order, the rule hint, and the save button', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-password-section');
    expect(within(section).getByText('Password')).toBeTruthy();
    expect(within(section).getByText('Current password')).toBeTruthy();
    expect(within(section).getByText('New password')).toBeTruthy();
    expect(within(section).getByLabelText('Current password')).toBeTruthy();
    expect(within(section).getByLabelText('New password')).toBeTruthy();
    expect(
      within(section).getByText(
        'At least 8 characters. Not just numbers, not too common, not too similar to your email or name.',
      ),
    ).toBeTruthy();
    expect(within(section).getByText('Confirm new password')).toBeTruthy();
    expect(within(section).getByLabelText('Confirm new password')).toBeTruthy();
    expect(within(section).getByRole('button', { name: 'Save new password' })).toBeTruthy();
  });

  it('masks all three password fields', () => {
    render(<AccountScreen />);
    expect(screen.getByLabelText('Current password').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('New password').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Confirm new password').props.secureTextEntry).toBe(true);
  });
});

describe('profile: AccountScreen Password section submit contract', () => {
  it('submits exactly { current_password, new_password, new_password_confirm }', async () => {
    render(<AccountScreen />);
    fillPasswordForm({ current: 'oldpassword', next: 'newlongpass1', confirm: 'newlongpass1' });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(mockChangePasswordMutate).toHaveBeenCalledWith(
        {
          current_password: 'oldpassword',
          new_password: 'newlongpass1',
          new_password_confirm: 'newlongpass1',
        },
        expect.anything(),
      ),
    );
  });
});

describe('profile: AccountScreen Password section disabled states (issue acceptance criteria)', () => {
  it('disables Save new password while the mutation is pending', () => {
    mockChangePasswordState = { mutate: mockChangePasswordMutate, isPending: true };
    render(<AccountScreen />);
    expect(
      screen.getByRole('button', { name: 'Save new password' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('disables Save new password while offline', () => {
    act(() => {
      useConnectivityStore.setState({
        isOnline: false,
        networkOnline: false,
        simulatedOffline: true,
      });
    });
    render(<AccountScreen />);
    expect(
      screen.getByRole('button', { name: 'Save new password' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('does not disable Save new password when online and idle', () => {
    render(<AccountScreen />);
    expect(
      screen.getByRole('button', { name: 'Save new password' }).props.accessibilityState?.disabled,
    ).toBeFalsy();
  });
});

describe('profile: AccountScreen Password section error states (design "19d · Password states")', () => {
  it('shows "That\'s not right. Try again." under Current password on a wrong-current-password error', async () => {
    mockChangePasswordMutate.mockImplementation((_values, options) => {
      options?.onError?.(
        new ApiError('bad request', 'validation', 400, {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid password change data',
            details: { current_password: ['Current password is incorrect.'] },
          },
        }),
      );
    });
    render(<AccountScreen />);
    fillPasswordForm();
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(screen.getByText("That's not right. Try again.")).toBeTruthy());
    expect(screen.queryByText("These don't match.")).toBeNull();
  });

  it('catches a mismatched confirmation locally with "These don\'t match." and never calls the mutation', async () => {
    render(<AccountScreen />);
    fillPasswordForm({ current: 'oldpassword', next: 'newlongpass1', confirm: 'somethingelse1' });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(screen.getByText("These don't match.")).toBeTruthy());
    expect(mockChangePasswordMutate).not.toHaveBeenCalled();
  });

  it('shows the design rules-not-met message for a short new password and never calls the mutation', async () => {
    render(<AccountScreen />);
    fillPasswordForm({ current: 'oldpassword', next: 'short1', confirm: 'short1' });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(screen.getByText('At least 8 characters. Try again.')).toBeTruthy());
    expect(screen.queryByText(/Too small: expected string/)).toBeNull();
    expect(mockChangePasswordMutate).not.toHaveBeenCalled();
  });

  it("shows the backend's own rules-not-met reason under New password (issue: real error messages)", async () => {
    mockChangePasswordMutate.mockImplementation((_values, options) => {
      options?.onError?.(
        new ApiError('bad request', 'validation', 400, {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid password change data',
            details: {
              non_field_errors: [
                'This password is too common.',
                'This password is entirely numeric.',
              ],
            },
          },
        }),
      );
    });
    render(<AccountScreen />);
    fillPasswordForm({ current: 'oldpassword', next: '12345678', confirm: '12345678' });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(
        screen.getByText('This password is too common. This password is entirely numeric.'),
      ).toBeTruthy(),
    );
  });

  it('shows a generic error when the server error has no password field details', async () => {
    mockChangePasswordMutate.mockImplementation((_values, options) => {
      options?.onError?.(new ApiError('Something went wrong on our side.', 'server', 500));
    });
    render(<AccountScreen />);
    fillPasswordForm();
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() =>
      expect(screen.getByText("Couldn't change your password. Try again.")).toBeTruthy(),
    );
  });

  it('shows "Password changed." with a checkmark and clears all three fields on success', async () => {
    mockChangePasswordMutate.mockImplementation((_values, options) => {
      options?.onSuccess?.();
    });
    render(<AccountScreen />);
    fillPasswordForm({ current: 'oldpassword', next: 'newlongpass1', confirm: 'newlongpass1' });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(screen.getByText('Password changed.')).toBeTruthy());
    const successIcon = screen.getByTestId('account-password-success-icon');
    expect(successIcon).toBeTruthy();
    expect(successIcon.findByProps({ d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' })).toBeTruthy();
    expect(screen.getByLabelText('Current password').props.value).toBe('');
    expect(screen.getByLabelText('New password').props.value).toBe('');
    expect(screen.getByLabelText('Confirm new password').props.value).toBe('');
  });
});

describe('profile: AccountScreen Password section security (issue: never log or store passwords)', () => {
  it('never passes a typed password value to console.log or console.warn', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<AccountScreen />);
    fillPasswordForm({
      current: 'super-secret-current',
      next: 'super-secret-next1',
      confirm: 'super-secret-next1',
    });
    fireEvent.press(screen.getByRole('button', { name: 'Save new password' }));

    const loggedStrings = [...logSpy.mock.calls, ...warnSpy.mock.calls].flat().map(String);
    expect(loggedStrings.join(' ')).not.toContain('super-secret-current');
    expect(loggedStrings.join(' ')).not.toContain('super-secret-next1');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
