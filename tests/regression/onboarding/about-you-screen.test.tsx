/**
 * Issue #10 — design file lines 307-364 (7a·4 "About you · only if Diet was picked") puts age,
 * height, weight AND sex on one screen under "The basics, so my **math is right.**", with no
 * subtitle and a solid-ink "Continue" pill (not the shared glass `NextBar` "Next" footer). The app
 * previously split sex onto its own `GenderScreen` with invented copy ("And how do you identify?",
 * "Helps me get your numbers right.") and added an invented subtitle ("Slide, or just tell me.")
 * here (pre-fix `src/features/onboarding/screens/AboutYouScreen.tsx:41-42`,
 * `GenderScreen.tsx:44-48`). This protects: the merged single-screen layout, the exact design
 * copy, the sex chips (`GENDERS` from `shared/types/user.ts`, the same backend-aligned values
 * `GenderScreen` used), the Continue button's enabled state, and that picking a sex option stores
 * `draft.gender` the same way `GenderScreen` did (consumed by `SaveScreen`/`authApi.ts:84-91` only
 * when Diet was picked, matching backend `apps/users/serializers.py:94-101`).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import AboutYouScreen from '@/features/onboarding/screens/AboutYouScreen';
import {
  useOnboardingStore,
  ONBOARDING_DEFAULTS,
} from '@/features/onboarding/store/onboardingStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('onboarding: About You screen matches the design (issue #10)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useOnboardingStore.setState({
      draft: { ...ONBOARDING_DEFAULTS, pillars: ['diet'] },
      lastCompletedStep: null,
    });
  });

  it('shows the design headline and no invented subtitle', () => {
    render(<AboutYouScreen />);

    expect(screen.getByText(/The basics, so my/)).toBeTruthy();
    expect(screen.getByText('math is right.')).toBeTruthy();
    expect(screen.queryByText('Slide, or just tell me.')).toBeNull();
  });

  it('shows Age, Height and Weight sliders', () => {
    render(<AboutYouScreen />);

    expect(screen.getByText('Age')).toBeTruthy();
    expect(screen.getByText('Height')).toBeTruthy();
    expect(screen.getByText('Weight')).toBeTruthy();
  });

  it('shows a Sex card with the four design chips, no separate gender screen copy', () => {
    render(<AboutYouScreen />);

    expect(screen.getByText('Sex')).toBeTruthy();
    expect(screen.getByText('Male')).toBeTruthy();
    expect(screen.getByText('Female')).toBeTruthy();
    expect(screen.getByText('Other')).toBeTruthy();
    expect(screen.getByText('Prefer not to say')).toBeTruthy();
    expect(screen.queryByText(/how do you/)).toBeNull();
    expect(screen.queryByText('Helps me get your numbers right.')).toBeNull();
  });

  it('pads the Sex card contents without insetting the glass surface', () => {
    render(<AboutYouScreen />);

    expect(screen.getByTestId('sex-card-content')).toHaveStyle({
      paddingVertical: 14,
      paddingHorizontal: 20,
    });
  });

  it('picking a sex chip stores draft.gender', () => {
    render(<AboutYouScreen />);

    fireEvent.press(screen.getByText('Female'));

    expect(useOnboardingStore.getState().draft.gender).toBe('female');
  });

  it('shows a disabled Continue button until a sex is chosen', () => {
    render(<AboutYouScreen />);

    expect(
      screen.getByRole('button', { name: 'Continue' }).props.accessibilityState?.disabled,
    ).toBe(true);

    fireEvent.press(screen.getByText('Male'));

    expect(
      screen.getByRole('button', { name: 'Continue' }).props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('completes the step and advances on Continue', () => {
    useOnboardingStore.setState({
      draft: { ...ONBOARDING_DEFAULTS, pillars: ['diet'], gender: 'male' },
      lastCompletedStep: null,
    });
    render(<AboutYouScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(useOnboardingStore.getState().lastCompletedStep).toBe('about-you');
    expect(mockPush).toHaveBeenCalledWith('/(public)/onboarding/save');
  });
});
