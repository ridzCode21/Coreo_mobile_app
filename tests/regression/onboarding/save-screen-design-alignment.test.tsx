import { fireEvent, render, screen, within } from '@testing-library/react-native';

import SaveScreen from '@/features/onboarding/screens/SaveScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';
import { colors, radii, spacing, typography } from '@/shared/theme/tokens';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useRegisterMutation: () => ({ mutate: jest.fn(), isPending: false }),
    useLoginMutation: () => ({ mutate: jest.fn(), isPending: false }),
    useGoogleSignInMutation: () => ({ mutate: jest.fn(), isPending: false }),
  };
});

function seedDraft() {
  useOnboardingStore.setState({
    draft: {
      ...ONBOARDING_DEFAULTS,
      name: 'Maya',
      goal: 'lose_weight',
      pillars: ['diet'],
    },
    lastCompletedStep: null,
  });
}

describe('design tokens added for issue #12', () => {
  it("defines ink80 for the design's Google-label strength", () => {
    expect(colors.ink80).toBe('rgba(23,25,29,0.8)');
  });

  it('defines a 12px/400 linkMd typography token', () => {
    expect(typography.linkMd).toEqual(expect.objectContaining({ fontSize: 12, fontWeight: '400' }));
  });

  it('defines a 14px legal-card radius', () => {
    expect(radii.legal).toBe(14);
  });
});

describe('onboarding: Save your core matches the design', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedDraft();
  });

  it('builds the summary line in title case with middle-dot sections', () => {
    render(<SaveScreen />);
    expect(screen.getByText('Maya · Lose weight · Diet')).toBeTruthy();
  });

  it('title-cases every active pillar', () => {
    useOnboardingStore.setState((state) => ({
      draft: {
        ...state.draft,
        name: 'Sam',
        goal: 'get_stronger',
        pillars: ['fitness', 'wellness'],
      },
    }));
    render(<SaveScreen />);
    expect(screen.getByText('Sam · Get stronger · Fitness + Wellness')).toBeTruthy();
  });

  it('shows the exact two-path wave-ripple icon beside the summary', () => {
    render(<SaveScreen />);
    const card = screen.getByTestId('save-summary-card');
    expect(within(card).UNSAFE_getByProps({ d: 'M4 9c2.5-2 5.5-2 8 0s5.5 2 8 0' })).toBeTruthy();
    expect(within(card).UNSAFE_getByProps({ d: 'M4 15c2.5-2 5.5-2 8 0s5.5 2 8 0' })).toBeTruthy();
  });

  it('does not render a fake Continue with Apple control', () => {
    render(<SaveScreen />);
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
    expect(screen.queryByText('Continue with Apple')).toBeNull();
  });

  it('uses the design colors and typography for Google and email labels', () => {
    render(<SaveScreen />);
    expect(screen.getByTestId('save-google-label')).toHaveStyle({ color: colors.ink80 });
    expect(screen.getByTestId('save-email-link-text')).toHaveStyle({
      fontSize: 12,
      color: colors.ink55,
    });
  });

  it('exposes a stable email link and navigates without an inline form', () => {
    render(<SaveScreen />);
    expect(screen.queryByPlaceholderText('Email')).toBeNull();

    fireEvent.press(screen.getByRole('link', { name: 'Use email instead' }));

    expect(mockPush).toHaveBeenCalledWith('/(public)/onboarding/create-account');
    expect(screen.queryByPlaceholderText('Email')).toBeNull();
    expect(screen.queryByText('Use Apple or Google instead')).toBeNull();
  });

  it('uses the design radius and padding for the privacy card', () => {
    render(<SaveScreen />);
    expect(screen.getByTestId('save-privacy-card')).toHaveStyle({
      borderRadius: radii.legal,
      paddingVertical: spacing.ms,
      paddingHorizontal: spacing.ml,
    });
  });
});
