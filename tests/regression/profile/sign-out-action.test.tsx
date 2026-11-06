/**
 * Issue #180 — the "Sign out" row and its confirmation sheet. Confirming calls the session
 * store's `signOut()` (which does the server call + cleanup, see
 * tests/regression/auth/sign-out-calls-logout.test.ts and sign-out-clears-account-cache.test.ts)
 * and then navigates to the app's one first screen with a `signedOut=1` marker
 * (plan.md Decisions 11-12), landing on design board `19e · After sign-out → 20a`.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignOutAction } from '@/features/profile/components/SignOutAction';

const mockSignOut = jest.fn();
const mockReplace = jest.fn();
let mockPendingMealCount = 0;
let mockIsOnline = true;

jest.mock('@/features/auth', () => ({
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

jest.mock('@/features/nutrition', () => ({
  usePendingMealCount: () => mockPendingMealCount,
}));

jest.mock('@/shared/stores/connectivityStore', () => ({
  useConnectivityStore: (selector: (state: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: mockIsOnline }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('profile: SignOutAction (issue #180)', () => {
  beforeEach(() => {
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockReplace.mockClear();
    mockPendingMealCount = 0;
    mockIsOnline = true;
  });

  it('renders a "Sign out" button that does not sign out by itself', () => {
    render(<SignOutAction />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('opens the default sheet when online with no queued meals', () => {
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Sign out?')).toBeTruthy();
    expect(
      screen.getByText("You'll need to sign in again to see your core. Everything stays saved."),
    ).toBeTruthy();
  });

  it('opens the pending-meals sheet with the real count when meals are queued', () => {
    mockPendingMealCount = 2;
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('2 meals syncing')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out anyway' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Wait' })).toBeTruthy();
  });

  it('renders the pending-meals title as the design eyebrow, not a sheet title', () => {
    mockPendingMealCount = 2;
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByText('2 meals syncing')).toHaveStyle({
      fontSize: 10,
      fontFamily: 'Poppins_500Medium',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    });
  });

  it('opens the offline sheet when offline with no queued meals', () => {
    mockIsOnline = false;
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(
      screen.getByText(
        "You're offline. You can still sign out — you'll just need to sign in when you're back online.",
      ),
    ).toBeTruthy();
  });

  it('renders the offline title as the design eyebrow, not a sheet title', () => {
    mockIsOnline = false;
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByText('Offline')).toHaveStyle({
      fontSize: 10,
      fontFamily: 'Poppins_500Medium',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    });
  });

  it('"Cancel" closes the sheet without signing out', () => {
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText('Sign out?')).toBeNull();
  });

  it('"Wait" closes the pending-meals sheet without signing out', () => {
    mockPendingMealCount = 1;
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.press(screen.getByRole('button', { name: 'Wait' }));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText('1 meal syncing')).toBeNull();
  });

  it('confirming signs out and then replaces the route with the signed-out first screen', async () => {
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Sign out' })[1]);

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/(public)/first-open?signedOut=1');
  });

  it('disables the primary button and shows it busy while signing out is in flight', async () => {
    let resolveSignOut: () => void = () => undefined;
    mockSignOut.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    render(<SignOutAction />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    const confirmButton = screen.getAllByRole('button', { name: 'Sign out' })[1];
    fireEvent.press(confirmButton);

    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: 'Sign out' })[1].props.accessibilityState?.disabled,
      ).toBe(true),
    );

    resolveSignOut();
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });
});
