/**
 * Issue #126 — the manual-entry "Looks right" primary action painted a legacy coreBlue
 * (#35689E → #16395E) gradient instead of the design's solid ink (#17191D) fill
 * (docs/design-system.md §1 law 4: "Primary buttons are solid ink").
 */

import { render, screen, within } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';

import ConfirmMealScreen from '@/features/nutrition/screens/ConfirmMealScreen';
import { colors } from '@/shared/theme/tokens';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({
    source: 'manual',
    prefill: JSON.stringify({ food_name: 'Protein bar' }),
  }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-28',
  useCreateFoodEntryMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateFoodEntriesMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe('nutrition: ConfirmMealScreen primary button is solid ink (issue #126)', () => {
  it('fills the "Looks right" action with solid ink, not the retired coreBlue gradient', () => {
    render(<ConfirmMealScreen />);

    const button = screen.getByRole('button', { name: 'Looks right — log it' });
    const gradient = within(button).UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual([colors.ink, colors.ink]);
  });
});
