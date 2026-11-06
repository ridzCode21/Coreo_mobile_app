/**
 * Issue #180, design board `19e · After sign-out → 20a`: sign-out lands on the app's one first
 * screen (FirstOpenScreen, 20a) with a small "You're signed out." toast overlaid on top of it,
 * carried via a `signedOut=1` route param (plan.md Decision 12) rather than a persisted flag.
 */

import { render, screen } from '@testing-library/react-native';

import FirstOpenScreen from '@/features/onboarding/screens/FirstOpenScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => mockParams,
}));

describe('onboarding: FirstOpenScreen shows the signed-out toast (issue #180)', () => {
  beforeEach(() => {
    mockParams = {};
  });

  it('shows no toast on a normal first-open visit', () => {
    render(<FirstOpenScreen />);
    expect(screen.queryByText("You're signed out.")).toBeNull();
  });

  it('shows "You\'re signed out." when navigated here with signedOut=1', () => {
    mockParams = { signedOut: '1' };
    render(<FirstOpenScreen />);
    const toastText = screen.getByText("You're signed out.");

    expect(toastText).toHaveStyle({ fontSize: 10, fontFamily: 'Poppins_400Regular' });
    expect(screen.getByTestId('first-open-signed-out-toast')).toHaveStyle({
      paddingHorizontal: 16,
      paddingVertical: 7,
    });
  });

  it('still shows the normal 20a content (Meet your core) alongside the toast', () => {
    mockParams = { signedOut: '1' };
    render(<FirstOpenScreen />);
    expect(screen.getByRole('button', { name: 'Meet your core' })).toBeTruthy();
  });
});
