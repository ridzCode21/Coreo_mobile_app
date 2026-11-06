/**
 * Issue #176 — Account screen states (design 19d Account · loading / error / offline / expired,
 * design-spec 2895-2939). Session-expired detection is screen-local (plan.md Decision #6: #113
 * hasn't landed); offline is read from the existing `useConnectivityStore`, not from the query's
 * error kind (Decision #7, #9).
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { ApiError } from '@/shared/api/errors';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/profile/api/passwordApi', () => ({
  useChangePasswordMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

// Issue #179: Contact us / Legal rows, mocked at the hook boundary so this pre-existing screen
// test keeps passing now that AccountScreen renders those sections too.
jest.mock('@/features/profile/api/contactSupportApi', () => ({
  useSendSupportMessageMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/profile/api/appConfigApi', () => ({
  useAppConfigQuery: () => ({
    data: {
      termsUrl: 'https://med_app.com/terms',
      privacyUrl: 'https://med_app.com/privacy',
    },
    isLoading: false,
    isError: false,
  }),
}));

const baseUser = {
  first_name: 'Shubham',
  last_name: 'Rao',
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
const mockRefetch = jest.fn();
const mockMutate = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => mockProfileState,
  useUpdateProfileMutation: () => ({ mutate: mockMutate, isPending: false }),
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useConnectivityStore.setState({ isOnline: true, networkOnline: true, simulatedOffline: false });
  });
});

describe('profile: AccountScreen loading state', () => {
  it('shows a loading indicator and no identity content while the profile query is pending', () => {
    mockProfileState = { data: undefined, isLoading: true, error: null, refetch: mockRefetch };
    render(<AccountScreen />);
    expect(screen.getByTestId('account-loading')).toBeTruthy();
    expect(screen.queryByTestId('account-header')).toBeNull();
  });
});

describe('profile: AccountScreen error state (design-spec 2914-2922)', () => {
  it('shows the exact error copy with working Retry and Back', () => {
    mockProfileState = {
      data: undefined,
      isLoading: false,
      error: ApiError.fromResponse(500, {}),
      refetch: mockRefetch,
    };
    render(<AccountScreen />);
    expect(
      screen.getByText('Something went wrong loading your account. Your data is safe.'),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('profile: AccountScreen session-expired state (design-spec 2934-2939)', () => {
  it('shows "Sign in again" instead of the generic error when the session is dead', () => {
    mockProfileState = {
      data: undefined,
      isLoading: false,
      error: ApiError.fromResponse(401, {}),
      refetch: mockRefetch,
    };
    render(<AccountScreen />);
    expect(screen.getByText('Your session ended. Sign in again to see your account.')).toBeTruthy();
    expect(
      screen.queryByText('Something went wrong loading your account. Your data is safe.'),
    ).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Sign in again' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('profile: AccountScreen offline state (design-spec 2924-2932)', () => {
  beforeEach(() => {
    mockProfileState = { data: baseUser, isLoading: false, error: null, refetch: mockRefetch };
  });

  it('shows the offline message and keeps identity content visible', () => {
    act(() => {
      useConnectivityStore.setState({
        isOnline: false,
        networkOnline: false,
        simulatedOffline: true,
      });
    });
    render(<AccountScreen />);
    expect(screen.getByText("You're offline. Reconnect to save changes.")).toBeTruthy();
    expect(screen.getByTestId('account-header')).toBeTruthy();
  });

  it('disables Save name while offline and mid-edit — pressing it is a no-op', () => {
    act(() => {
      useConnectivityStore.setState({
        isOnline: false,
        networkOnline: false,
        simulatedOffline: true,
      });
    });
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    const saveButton = screen.getByRole('button', { name: 'Save name' });
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(saveButton);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not show the offline message while online', () => {
    render(<AccountScreen />);
    expect(screen.queryByText("You're offline. Reconnect to save changes.")).toBeNull();
  });
});
