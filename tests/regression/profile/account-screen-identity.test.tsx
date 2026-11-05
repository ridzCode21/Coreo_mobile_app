/**
 * Issue #176 — Account screen (design 19d Account, design-spec 2777-2811) identity header, "Your
 * name" edit session (design 19d · Your name · states, 2950-3010), and the Back-button discard
 * guard. The prior attempt at this issue failed its own RED check because a test matched both the
 * header display name and the "First name" row value with one `getByText('Shubham')` — both render
 * the same string. Every query below that could hit two nodes uses a `testID` (via `within`/
 * `getByTestId`) instead, per plan.md Decision log #1.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { colors } from '@/shared/theme/tokens';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockExportMutate = jest.fn();
const mockDeleteDataMutate = jest.fn();
const mockDeleteAccountMutate = jest.fn();
jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: mockExportMutate, isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: mockDeleteDataMutate, isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: mockDeleteAccountMutate, isPending: false }),
}));

jest.mock('@/features/profile/api/passwordApi', () => ({
  useChangePasswordMutation: () => ({ mutate: jest.fn(), isPending: false }),
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
const mockRefetch = jest.fn();
const mockMutate = jest.fn();
let mockMutationState: { mutate: jest.Mock; isPending: boolean };
const mockSignOut = jest.fn();

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => mockProfileState,
  useUpdateProfileMutation: () => mockMutationState,
  useSessionStore: { getState: () => ({ signOut: mockSignOut }) },
}));

function setUser(overrides: Partial<typeof baseUser> = {}) {
  mockProfileState = {
    data: { ...baseUser, ...overrides },
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setUser();
  mockMutationState = { mutate: mockMutate, isPending: false };
  act(() => {
    useConnectivityStore.setState({ isOnline: true, networkOnline: true, simulatedOffline: false });
  });
});

describe('profile: AccountScreen identity header (design-spec 2790-2794)', () => {
  it('shows the avatar initial, display name, email and "With Coreo since <month>" (no week)', () => {
    render(<AccountScreen />);
    const header = screen.getByTestId('account-header');
    expect(within(header).getByText('S')).toBeTruthy();
    expect(within(header).getByTestId('account-header-name')).toHaveTextContent('Shubham');
    expect(within(header).getByText('shubham@example.com')).toBeTruthy();
    expect(within(header).getByText('With Coreo since March')).toBeTruthy();
  });
});

describe('profile: AccountScreen "Your name" display rows (design-spec 2797-2806)', () => {
  it('shows First name and Last name values, scoped so they never collide with the header name', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByTestId('account-first-name-value')).toHaveTextContent('Shubham');
  });

  it('shows "Add a last name" when last_name is empty', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByText('Add a last name')).toBeTruthy();
  });

  it('shows "Add a first name" when first_name is empty', () => {
    setUser({ first_name: '' });
    render(<AccountScreen />);
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByText('Add a first name')).toBeTruthy();
  });

  it('shows the real last name when present', () => {
    setUser({ last_name: 'Rao' });
    render(<AccountScreen />);
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByTestId('account-last-name-value')).toHaveTextContent('Rao');
  });
});

describe('profile: AccountScreen time zone row (design-spec 2807-2810)', () => {
  it('shows the raw IANA timezone string, not a humanized label', () => {
    render(<AccountScreen />);
    expect(screen.getByTestId('account-timezone-value')).toHaveTextContent('America/New_York');
  });
});

describe('profile: AccountScreen "Your name" edit session (design-spec 2958-2991)', () => {
  it('opens one edit session covering both fields when First name is tapped', () => {
    setUser({ last_name: 'Rao' });
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    expect(screen.getByLabelText('First name')).toBeTruthy();
    expect(screen.getByLabelText('Last name')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeTruthy();
  });

  it('opens the same edit session when Last name is tapped', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-last-name-row'));
    expect(screen.getByLabelText('First name')).toBeTruthy();
  });

  it('Cancel with no changes exits immediately, with no discard prompt', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText("You've changed your name. Leave without saving?")).toBeNull();
    expect(screen.queryByLabelText('First name')).toBeNull();
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByTestId('account-first-name-value')).toHaveTextContent('Shubham');
  });

  it('does not prompt to discard whitespace-only changes that save back to the original value', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), '  Shubham  ');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText("You've changed your name. Leave without saving?")).toBeNull();
    expect(screen.queryByLabelText('First name')).toBeNull();
  });

  it('Cancel with unsaved changes shows the discard prompt (design-spec 3002-3010)', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText("You've changed your name. Leave without saving?")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy();
  });

  it('gives Keep editing the primary treatment and Discard the attention treatment', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Keep editing' }).props.style),
    ).toMatchObject({ backgroundColor: colors.ink });
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'Discard' }).props.style),
    ).toMatchObject({
      backgroundColor: colors.attention12,
      borderColor: colors.attention25,
    });
  });

  it('"Keep editing" returns to the edit session, keeping the typed value', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('First name').props.value).toBe('Sam');
  });

  it('"Discard" reverts to the original value and exits edit mode, staying on screen', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByLabelText('First name')).toBeNull();
    const section = screen.getByTestId('account-name-section');
    expect(within(section).getByTestId('account-first-name-value')).toHaveTextContent('Shubham');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('blocks saving a blank first name with the exact field error and never calls the mutation', async () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), '   ');
    fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.getByText("Your name can't be empty.")).toBeTruthy());
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('uses the attention border while the first-name field has an error', async () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), '   ');
    fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByLabelText('First name').props.style)).toMatchObject({
        borderColor: colors.attention45,
      }),
    );
  });

  it('saves with exactly the trimmed { first_name, last_name } contract', async () => {
    setUser({ last_name: 'Rao' });
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), '  Sam  ');
    fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        { first_name: 'Sam', last_name: 'Rao' },
        expect.anything(),
      ),
    );
  });

  it('shows "Saving…" and disables Cancel/Save while the mutation is pending', () => {
    mockMutationState = { mutate: mockMutate, isPending: true };
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' }).props.accessibilityState?.disabled).toBe(
      true,
    );
  });

  it('shows "Name saved." and returns to display mode after a successful save', async () => {
    mockMutate.mockImplementation((_values, options) => {
      options?.onSuccess?.();
    });
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.getByText('Name saved.')).toBeTruthy());
    expect(screen.getByTestId('account-name-saved-icon')).toBeTruthy();
    expect(screen.queryByLabelText('First name')).toBeNull();
  });

  it('keeps the edit session visible with a retry message when saving fails', async () => {
    mockMutate.mockImplementation((_values, options) => {
      options?.onError?.();
    });
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() =>
      expect(screen.getByText("Couldn't save your name. Try again.")).toBeTruthy(),
    );
    expect(screen.getByLabelText('First name').props.value).toBe('Sam');
  });
});

describe('profile: AccountScreen Back button + unsaved changes (acceptance: "asks first")', () => {
  it('navigates back immediately when there are no unsaved changes', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows the discard prompt instead of navigating when there are unsaved name changes', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText("You've changed your name. Leave without saving?")).toBeTruthy();
  });

  it('"Discard" from the Back-triggered prompt completes the navigation', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByTestId('account-first-name-row'));
    fireEvent.changeText(screen.getByLabelText('First name'), 'Sam');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
