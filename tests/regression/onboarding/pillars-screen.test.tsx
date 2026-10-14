/**
 * Issue #9 — Pillars (7a·3, design file lines 269-306): two-weight title ("Where do we
 * **start?**"), the design subtitle, "All three"/"These two" quick picks, and 76px rows (the
 * existing `radii.xl` default, 26-30px per docs/design-system.md §3, already covers the design's
 * 26px radius — only the row height changes). The Next bar stays (unlike Goal, picking a pillar
 * doesn't commit a single answer, so an explicit continue is still needed).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import PillarsScreen from '@/features/onboarding/screens/PillarsScreen';
import { ToggleRow } from '@/shared/components/ToggleRow';
import {
  useOnboardingStore,
  ONBOARDING_DEFAULTS,
} from '@/features/onboarding/store/onboardingStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('onboarding: Pillars screen matches the design (issue #9)', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ draft: { ...ONBOARDING_DEFAULTS }, lastCompletedStep: null });
  });

  it('shows the two-weight headline and the design subtitle', () => {
    render(<PillarsScreen />);

    expect(screen.getByText(/Where do we/)).toBeTruthy();
    expect(screen.getByText('start?')).toBeTruthy();
    expect(
      screen.getByText(
        "Pick one pillar, two, or take all three. I'll ask the right questions once you choose.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText("I'll always start with your nutrition core, whatever you choose."),
    ).toBeNull();
  });

  it('shows Fitness, Diet and Wellness rows plus the two quick picks, in design order', () => {
    render(<PillarsScreen />);

    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('All three')).toBeTruthy();
    expect(screen.getByText('These two')).toBeTruthy();
  });

  it('uses 76px-tall pillar rows', () => {
    render(<PillarsScreen />);

    const rows = screen.UNSAFE_getAllByType(ToggleRow);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.props.minHeight).toBe(76);
    }
  });

  it('"All three" selects all three pillars', () => {
    render(<PillarsScreen />);

    fireEvent.press(screen.getByText('All three'));

    expect(useOnboardingStore.getState().draft.pillars.sort()).toEqual([
      'diet',
      'fitness',
      'wellness',
    ]);
  });

  it('keeps the Next bar, disabled until at least one pillar is picked', () => {
    render(<PillarsScreen />);
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState?.disabled).toBe(
      true,
    );

    fireEvent.press(screen.getByText('Fitness'));

    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState?.disabled).toBe(
      false,
    );
  });
});
