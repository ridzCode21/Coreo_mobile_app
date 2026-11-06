/**
 * Issue #179 — AccountScreen Legal row (design "19d Account", design-spec 2858-2865: "Terms ·
 * Privacy · v2.4.1"). Terms/Privacy addresses come only from `GET /core/config/`
 * (`data.config.settings.terms_url` / `.privacy_policy_url` — apps/core/views.py:154-166), never
 * hardcoded, and the row must not call `Linking.openURL(undefined)` before that query resolves
 * (plan.md Decision log #6). The version string comes from `appVersionLabel`
 * (`app-version-label.test.ts`) fed by `expo-constants`, not a hardcoded design value — the design's
 * "v2.4.1" is a mockup placeholder, not the app's real version.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { colors, componentSizes } from '@/shared/theme/tokens';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

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

jest.mock('@/features/profile/api/contactSupportApi', () => ({
  useSendSupportMessageMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({
    data: {
      first_name: 'Shubham',
      last_name: '',
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

let mockConfigState: { data: unknown; isLoading: boolean; isError: boolean };

jest.mock('@/features/profile/api/appConfigApi', () => ({
  useAppConfigQuery: () => mockConfigState,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigState = {
    data: { termsUrl: 'https://med_app.com/terms', privacyUrl: 'https://med_app.com/privacy' },
    isLoading: false,
    isError: false,
  };
  act(() => {
    useConnectivityStore.setState({ isOnline: true, networkOnline: true, simulatedOffline: false });
  });
});

describe('profile: AccountScreen Legal row layout (design-spec "19d Account" 2858-2865)', () => {
  it('shows Terms, Privacy, and the version in that order', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-legal-section');
    expect(within(section).getByRole('link', { name: 'Terms' })).toBeTruthy();
    expect(within(section).getByRole('link', { name: 'Privacy' })).toBeTruthy();
    expect(within(section).getByTestId('account-version-label').props.children).toBe('v1.0.0');
  });

  it('uses the design link, separator, and version treatments with accessible link targets', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-legal-section');
    const terms = within(section).getByRole('link', { name: 'Terms' });
    const privacy = within(section).getByRole('link', { name: 'Privacy' });
    const separators = within(section).getAllByText('·');
    const version = within(section).getByTestId('account-version-label');

    expect(terms.props.style).toEqual(
      expect.objectContaining({ minHeight: componentSizes.minimumTapTarget }),
    );
    expect(privacy.props.style).toEqual(
      expect.objectContaining({ minHeight: componentSizes.minimumTapTarget }),
    );
    expect(within(terms).getByText('Terms').props.style).toEqual(
      expect.objectContaining({ color: colors.ink45, textDecorationLine: 'underline' }),
    );
    expect(within(privacy).getByText('Privacy').props.style).toEqual(
      expect.objectContaining({ color: colors.ink45, textDecorationLine: 'underline' }),
    );
    separators.forEach((separator) => {
      expect(separator.props.style).toEqual(expect.objectContaining({ color: colors.ink20 }));
    });
    expect(version.props.style).toEqual(expect.objectContaining({ color: colors.ink30 }));
  });
});

describe('profile: AccountScreen Legal row interactions (issue: open in the browser)', () => {
  it('opens the Terms URL from GET /core/config/ in the browser', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'Terms' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://med_app.com/terms');
  });

  it('opens the Privacy URL from GET /core/config/ in the browser', () => {
    render(<AccountScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'Privacy' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://med_app.com/privacy');
  });

  it('is non-interactive before the config query resolves', () => {
    mockConfigState = { data: undefined, isLoading: true, isError: false };
    render(<AccountScreen />);
    const terms = screen.getByRole('link', { name: 'Terms' });
    const privacy = screen.getByRole('link', { name: 'Privacy' });
    expect(terms.props.accessibilityState?.disabled).toBe(true);
    expect(privacy.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(terms);
    fireEvent.press(privacy);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
