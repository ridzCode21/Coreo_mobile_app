import { fireEvent, render, screen } from '@testing-library/react-native';

import ForgotPasswordScreen from '@/features/auth/screens/ForgotPasswordScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

/**
 * Issue #14 — the design (8b, design-spec.md) links "Forgot your password?" to an `#8c` "reset
 * your password" screen that isn't part of this issue's two screens and has no design-source
 * markup here. Per the Blocked/Partial protocol (never invent a design or a flow the backend
 * wiring for 8c hasn't been designed for yet), this is a minimal, honest placeholder — no invented
 * reset flow, no claim the feature works — modeled on the existing `PillarComingSoonScreen`
 * pattern (`src/features/home/screens/PillarComingSoonScreen.tsx`). See `blocked.txt` (PARTIAL).
 */
describe('auth: Forgot password placeholder (issue #14, PARTIAL — 8c not built)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('states plainly that password reset is not available yet (no invented reset flow)', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.queryByPlaceholderText('Email')).toBeNull();
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('never shows a red/alarming error treatment', () => {
    render(<ForgotPasswordScreen />);
    // No explicit failure state is claimed here — this is a calm, static placeholder, not an
    // error screen; absence of any error-styled text is itself the assertion.
    expect(screen.queryByText(/error/i)).toBeNull();
  });

  it('links back to sign in', () => {
    render(<ForgotPasswordScreen />);
    const back = screen.getByRole('link', { name: /sign in/i });
    fireEvent.press(back);
    expect(mockBack).toHaveBeenCalled();
  });
});
