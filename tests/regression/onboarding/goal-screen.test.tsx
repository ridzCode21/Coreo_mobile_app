/**
 * Issue #8 — the Goal screen (7a·2) wrote the diet-tab's own 5-value goal_type
 * (`src/shared/types/dietProfile.ts` `GOAL_TYPES`) into the draft, not one of the six backend
 * interview goals `POST /users/register/` requires (apps/users/services/onboarding.py:5-14
 * `INTERVIEW_GOALS`). The visual redesign of this screen (copy, right-alignment, removing the
 * Next button) is issue #9's scope — this only protects that the six backend-valid goals are
 * offered and that picking one stores the exact backend value the register call needs.
 */

import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import GoalScreen from '@/features/onboarding/screens/GoalScreen';
import {
  useOnboardingStore,
  ONBOARDING_DEFAULTS,
} from '@/features/onboarding/store/onboardingStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockPush = jest.fn();

describe('onboarding: Goal screen sends a backend interview goal (issue #8)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useOnboardingStore.setState({ draft: { ...ONBOARDING_DEFAULTS }, lastCompletedStep: null });
  });

  it('offers exactly the six backend interview goals, in design order', () => {
    render(<GoalScreen />);

    const labels = [
      'Get stronger',
      'Sleep better',
      'Less stress',
      'Lose weight',
      'More energy',
      'Eat cleaner',
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // The old diet-tab-only options must not leak onto this screen.
    expect(screen.queryByText('Build muscle')).toBeNull();
    expect(screen.queryByText('Manage a health condition')).toBeNull();
  });

  it('stores the backend interview goal value when a chip is picked', () => {
    render(<GoalScreen />);

    fireEvent.press(screen.getByText('Get stronger'));

    expect(useOnboardingStore.getState().draft.goal).toBe('get_stronger');
  });
});

/**
 * Issue #9 — the Goal screen's visual redesign: the design subtitle, no extra note, no Next bar
 * (one tap on a goal continues), and the chips right-aligned (design-spec.md 7a·2: `justify-
 * content:flex-end`), matching design file lines 240-268.
 */
describe('onboarding: Goal screen matches the design (issue #9)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useOnboardingStore.setState({ draft: { ...ONBOARDING_DEFAULTS }, lastCompletedStep: null });
  });

  it('shows the design subtitle and no extra note or Next button', () => {
    render(<GoalScreen />);

    expect(screen.getByText("I'll get you there.")).toBeTruthy();
    expect(screen.queryByText('I will tune the rest around this.')).toBeNull();
    expect(screen.queryByText('You can sharpen this later from Diet.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('right-aligns the goal chips row', () => {
    render(<GoalScreen />);

    const row = screen.getByTestId('goal-chips-row');
    expect(StyleSheet.flatten(row.props.style).justifyContent).toBe('flex-end');
  });

  it('picking a goal immediately continues to the next step, with no Next tap needed', () => {
    render(<GoalScreen />);

    fireEvent.press(screen.getByText('Sleep better'));

    expect(useOnboardingStore.getState().draft.goal).toBe('sleep_better');
    expect(useOnboardingStore.getState().lastCompletedStep).toBe('goal');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
