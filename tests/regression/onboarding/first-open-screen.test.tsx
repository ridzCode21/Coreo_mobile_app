/**
 * Issue #11 — First open screen (design 24a lines 54-81 / 20a lines 160-210, design-spec.md) says
 * "Meet your core" with an arrow CTA and a link to sign in; the app previously said "Begin" in a
 * centred `minWidth:200` pill with no arrow and no way back to sign in
 * (pre-fix `FirstOpenScreen.tsx:59-63`). Protects: the copy swap, the arrow-button shape, the new
 * "I already have an account" link and its navigation, the 20a returning-account caption, the
 * logo size (74px), and that the original CTA behaviour (mark first-open seen, reset onboarding
 * draft, replace into the name step) still fires and isn't disturbed by the new link.
 */

import { render, screen, fireEvent, within } from '@testing-library/react-native';

import FirstOpenScreen from '@/features/onboarding/screens/FirstOpenScreen';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import {
  useOnboardingStore,
  ONBOARDING_DEFAULTS,
} from '@/features/onboarding/store/onboardingStore';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('onboarding: First open screen matches the design (issue #11)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    useAppFlagsStore.setState({ hasSeenFirstOpen: false });
    useOnboardingStore.setState({ draft: { ...ONBOARDING_DEFAULTS }, lastCompletedStep: null });
  });

  it('shows the design CTA copy, not the old "Begin" copy', () => {
    render(<FirstOpenScreen />);

    expect(screen.getByText('Meet your core')).toBeTruthy();
    expect(screen.queryByText('Begin')).toBeNull();
  });

  it('shapes the CTA as a full-width 58px pill with a 42x42 circular arrow button', () => {
    render(<FirstOpenScreen />);

    expect(screen.getByTestId('first-open-cta-row')).toHaveStyle({ height: 58 });
    expect(screen.getByTestId('first-open-cta-icon')).toHaveStyle({
      width: 42,
      height: 42,
      borderRadius: 21,
    });
  });

  it('shows an "I already have an account" link', () => {
    render(<FirstOpenScreen />);

    expect(screen.getByRole('link', { name: 'I already have an account' })).toBeTruthy();
  });

  it('shows the 20a returning-account caption under the link, exact copy', () => {
    render(<FirstOpenScreen />);

    expect(
      screen.getByText('Returning account? Sign in at 8b and skip the interview.'),
    ).toBeTruthy();
  });

  it('tapping the account link opens sign in and does not touch onboarding state', () => {
    render(<FirstOpenScreen />);

    fireEvent.press(screen.getByRole('link', { name: 'I already have an account' }));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useAppFlagsStore.getState().hasSeenFirstOpen).toBe(false);
  });

  it('renders the logo at 74px', () => {
    render(<FirstOpenScreen />);

    expect(
      within(screen.getByTestId('first-open-logo-glow')).UNSAFE_getByProps({
        width: 74,
        height: 74,
      }),
    ).toBeTruthy();
  });

  it('shows a glow element behind the logo', () => {
    render(<FirstOpenScreen />);

    expect(screen.getByTestId('first-open-logo-glow')).toBeTruthy();
  });

  it('still marks first-open seen, resets the draft, and replaces to the name step on the main CTA', async () => {
    useOnboardingStore.setState({
      draft: { ...ONBOARDING_DEFAULTS, name: 'stale' },
      lastCompletedStep: 'name',
    });
    render(<FirstOpenScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Meet your core' }));

    await screen.findByText('Meet your core');

    expect(useAppFlagsStore.getState().hasSeenFirstOpen).toBe(true);
    expect(useOnboardingStore.getState().draft.name).toBe(ONBOARDING_DEFAULTS.name);
    expect(mockReplace).toHaveBeenCalledWith('/(public)/onboarding/name');
  });
});
