/**
 * Issue #183 — replaces the old single `Alert.alert` for "Delete my account" with the design's
 * warning → type-your-email confirm → deleting/failed/offline/deleted flow (design boards 19h/19i,
 * design html lines 3437-3535). Backend: `DELETE /users/me/` (`apps/users/api/views/profile.py:210-213`)
 * reads no request body and performs no email check itself — the typed-email gate is frontend-only
 * (see `delete-account-email-match.test.ts`), and the mock contract for the endpoint itself (204,
 * removes the user, invalidates the token) is already covered by `account-mock-contract.test.ts`.
 * "Delete my data" keeps its own `Alert.alert`, unchanged — covered in `account-actions.test.tsx`.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AccountActionsSection } from '@/features/profile/components/AccountActionsSection';

const mockDeleteAccountMutate = jest.fn();
const mockExportMutate = jest.fn();
const mockSignOut = jest.fn();
const mockReplace = jest.fn();
let mockIsOnline = true;

const ACCOUNT_EMAIL = 'priya@example.com';

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

jest.mock('@/shared/stores/connectivityStore', () => ({
  useConnectivityStore: (selector: (state: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: mockIsOnline }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock(
  '../../../src/features/profile/components/SignOutAction',
  () => ({ SignOutAction: () => null }),
  { virtual: true },
);

function openWarning() {
  render(<AccountActionsSection accountEmail={ACCOUNT_EMAIL} />);
  fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
}

function goToConfirmEmail() {
  openWarning();
  fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
}

function typeMatchingEmail() {
  fireEvent.changeText(screen.getByLabelText('Email'), ACCOUNT_EMAIL);
}

describe('profile: AccountActionsSection — delete account flow (issue #183)', () => {
  beforeEach(() => {
    mockDeleteAccountMutate.mockReset();
    mockExportMutate.mockReset();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockReplace.mockClear();
    mockIsOnline = true;
  });

  it('tapping "Delete my account" opens the warning sheet, not a system Alert', () => {
    openWarning();
    expect(screen.getByText('Delete your account?')).toBeTruthy();
  });

  it('"Cancel" on the warning sheet closes it without calling the mutation', () => {
    openWarning();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete your account?')).toBeNull();
    expect(mockDeleteAccountMutate).not.toHaveBeenCalled();
  });

  it('"export your data" closes the delete sheet and opens the export sheet', () => {
    openWarning();
    fireEvent.press(screen.getByRole('button', { name: 'export your data' }));

    expect(screen.queryByText('Delete your account?')).toBeNull();
    expect(screen.getByText('Putting your file together…')).toBeTruthy();
    expect(mockExportMutate).toHaveBeenCalledTimes(1);
  });

  it('"Continue" moves to the type-your-email step', () => {
    goToConfirmEmail();
    expect(screen.getByText('Type your email to confirm')).toBeTruthy();
    expect(screen.getByPlaceholderText(ACCOUNT_EMAIL)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toHaveProp(
      'accessibilityState',
      { disabled: true },
    );
  });

  it('typing a non-matching email keeps the delete button disabled and does not call the mutation', () => {
    goToConfirmEmail();
    fireEvent.changeText(screen.getByLabelText('Email'), 'wrong@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(mockDeleteAccountMutate).not.toHaveBeenCalled();
  });

  it('typing the matching email (case-insensitive, trimmed) enables the button and confirms the delete', () => {
    goToConfirmEmail();
    fireEvent.changeText(screen.getByLabelText('Email'), `  ${ACCOUNT_EMAIL.toUpperCase()}  `);
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(mockDeleteAccountMutate).toHaveBeenCalledTimes(1);
  });

  it('shows "Closing your account…" while the mutation is in flight', () => {
    mockDeleteAccountMutate.mockImplementation(() => {
      /* never resolves within this test */
    });
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(screen.getByText('Closing your account…')).toBeTruthy();
  });

  it('on success, signs out, shows the deleted state, and "Start over" replaces the route with the first screen', async () => {
    mockDeleteAccountMutate.mockImplementation((_arg, options) => {
      options?.onSuccess?.();
    });
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Your account is gone. Start fresh any time.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start over' }));
    expect(mockReplace).toHaveBeenCalledWith('/(public)/first-open');
  });

  it('on failure, does not sign out, shows the failed state, and Retry calls the mutation again', () => {
    mockDeleteAccountMutate.mockImplementationOnce((_arg, options) => {
      options?.onError?.(new Error('boom'));
    });
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(screen.getByText('Something went wrong. Your account is still open.')).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();

    mockDeleteAccountMutate.mockImplementationOnce((_arg, options) => {
      options?.onSuccess?.();
    });
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockDeleteAccountMutate).toHaveBeenCalledTimes(2);
  });

  it('Retry checks connectivity again and shows the offline state without calling the mutation', () => {
    mockDeleteAccountMutate.mockImplementationOnce((_arg, options) => {
      mockIsOnline = false;
      options?.onError?.(new Error('boom'));
    });
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(mockDeleteAccountMutate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        "You're offline. Account deletion needs a connection. Try when you're back online.",
      ),
    ).toBeTruthy();
  });

  it('"Back" on the failed state returns to the type-your-email step with the typed email kept', () => {
    mockDeleteAccountMutate.mockImplementationOnce((_arg, options) => {
      options?.onError?.(new Error('boom'));
    });
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Type your email to confirm')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toHaveProp(
      'accessibilityState',
      { disabled: false },
    );
  });

  it('while offline, confirming blocks the call and shows the offline state instead', () => {
    mockIsOnline = false;
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));

    expect(mockDeleteAccountMutate).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "You're offline. Account deletion needs a connection. Try when you're back online.",
      ),
    ).toBeTruthy();
  });

  it('"Back" on the offline state returns to the type-your-email step', () => {
    mockIsOnline = false;
    goToConfirmEmail();
    typeMatchingEmail();
    fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByText('Type your email to confirm')).toBeTruthy();
  });
});
