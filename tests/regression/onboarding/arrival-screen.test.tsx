/**
 * Issue #16 — Arrival (7a·8, design file lines 577-626): after a successful save the app shows a
 * short arrival screen instead of jumping straight to Home. Exact copy, the user's name, the four
 * pillar petals with "Core" emphasized, and the "Enter Coreo" pill that hands off to Home.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import ArrivalScreen from '@/features/onboarding/screens/ArrivalScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

function seedDraft(name: string) {
  useOnboardingStore.setState({
    draft: { ...ONBOARDING_DEFAULTS, name },
    lastCompletedStep: null,
  });
}

describe('onboarding: Arrival screen matches the design (issue #16)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedDraft('Maya');
  });

  it("shows the exact headline with the user's name", () => {
    render(<ArrivalScreen />);

    expect(screen.getByText(/That's everything,/)).toBeTruthy();
    expect(screen.getByText('Maya.')).toBeTruthy();
  });

  it('renders a different name when the draft changes', () => {
    seedDraft('Theo');
    render(<ArrivalScreen />);

    expect(screen.getByText('Theo.')).toBeTruthy();
    expect(screen.queryByText('Maya.')).toBeNull();
  });

  it('shows the exact subtitle and the honest-number note', () => {
    render(<ArrivalScreen />);

    expect(screen.getByText('Your pillars are waiting. Come meet them.')).toBeTruthy();
    expect(
      screen.getByText(
        'For the first few days your wave stays dashed while I learn you. I will never show you an invented number.',
      ),
    ).toBeTruthy();
  });

  it('shows all four pillar petal labels', () => {
    render(<ArrivalScreen />);

    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Core')).toBeTruthy();
  });

  it('shows no invented number anywhere on the screen', () => {
    render(<ArrivalScreen />);

    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  it('exposes "Enter Coreo" as an accessible button', () => {
    render(<ArrivalScreen />);

    expect(screen.getByRole('button', { name: 'Enter Coreo' })).toBeTruthy();
  });

  it('opens Home and clears the onboarding draft when "Enter Coreo" is pressed', () => {
    render(<ArrivalScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Enter Coreo' }));

    expect(mockReplace).toHaveBeenCalledWith('/(app)');
    expect(useOnboardingStore.getState().draft).toEqual(ONBOARDING_DEFAULTS);
  });
});
