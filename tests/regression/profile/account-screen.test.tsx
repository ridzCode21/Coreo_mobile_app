/**
 * Issue #175 — "Add the Account row ... a placeholder screen is fine until then." `AccountScreen`
 * is the new destination for Profile's "Account" row (`/profile/account`). The design's 19d Account
 * screen (design-spec lines 2777-2890) is the full account screen (name/password/alerts/contact);
 * building that is explicitly left to later issues (plan.md "Out of scope"). This placeholder only
 * needs: the shared back control, the "Account" title (19d header, line 2785), and the
 * `AccountActionsSection` that used to live inline on Profile (plan.md Decision log #2) — so no
 * functionality (export/delete data/delete account) is lost in the move.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockExportMutate = jest.fn();
const mockDeleteDataMutate = jest.fn();
const mockDeleteAccountMutate = jest.fn();

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: mockDeleteDataMutate, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useSessionStore: { getState: () => ({ signOut: jest.fn() }) },
}));

describe('profile: AccountScreen placeholder (issue #175)', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('shows the "Account" title (design 19d header, line 2785)', () => {
    render(<AccountScreen />);
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('has a working back control', () => {
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
