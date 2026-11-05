/**
 * Issue #175 — "Add the Account row ... a placeholder screen is fine until then." `AccountScreen`
 * is the destination for Profile's "Account" row (`/profile/account`). Issue #176 then built out
 * the 19d Account identity/name/timezone content and the loading/error/offline/expired states (see
 * `account-screen-identity.test.tsx` and `account-screen-states.test.tsx`) — this file keeps #175's
 * three regression checks (title, back control, data actions reachable) passing against the real,
 * now-data-backed screen by adding the `useProfileQuery`/`useConnectivityStore` wiring #176
 * introduced as a dependency.
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }));

const mockExportMutate = jest.fn();
const mockDeleteDataMutate = jest.fn();
const mockDeleteAccountMutate = jest.fn();

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: mockDeleteDataMutate, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({
    data: {
      first_name: 'Shubham',
      last_name: 'Rao',
      email: 'shubham@example.com',
      timezone: 'America/New_York',
      created_at: '2026-03-02T00:00:00Z',
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSessionStore: { getState: () => ({ signOut: jest.fn() }) },
}));

describe('profile: AccountScreen placeholder regressions (issue #175, now backed by #176 data)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    act(() => {
      useConnectivityStore.setState({
        isOnline: true,
        networkOnline: true,
        simulatedOffline: false,
      });
    });
  });

  it('shows the "Account" title (design 19d header, line 2785)', () => {
    render(<AccountScreen />);
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('has a working back control when there are no unsaved changes', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the export/delete-data/delete-account actions reachable here instead of on Profile', () => {
    render(<AccountScreen />);
    expect(screen.getByRole('button', { name: 'Export my data' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my data' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeTruthy();
  });
});
