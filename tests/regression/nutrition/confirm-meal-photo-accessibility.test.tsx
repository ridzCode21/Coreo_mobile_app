import { render, screen } from '@testing-library/react-native';

import ConfirmMealScreen from '@/features/nutrition/screens/ConfirmMealScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({
    source: 'photo',
    prefill: JSON.stringify({
      food_name: 'Rice bowl',
      meal_type: 'lunch',
      calories: 205,
      protein_g: 4,
      carbs_g: 45,
      fat_g: 1,
      items: [
        {
          name: 'Steamed rice',
          portion_label: '1 cup',
          portion_grams: 150,
          est_calories: 205,
          est_protein_g: 4,
          est_carbs_g: 45,
          est_fat_g: 1,
          confidence: 0.92,
          guessed: false,
          guess_note: null,
          remembered: false,
        },
      ],
    }),
  }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
  useCreateFoodEntryMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateFoodEntriesMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe('nutrition: photo review compact controls remain accessible', () => {
  it('expands each 30px stepper to at least the 44px minimum tap target', () => {
    render(<ConfirmMealScreen />);

    expect(screen.getByRole('button', { name: 'Decrease Steamed rice' }).props.hitSlop).toEqual({
      top: 7,
      right: 7,
      bottom: 7,
      left: 7,
    });
    expect(screen.getByRole('button', { name: 'Increase Steamed rice' }).props.hitSlop).toEqual({
      top: 7,
      right: 7,
      bottom: 7,
      left: 7,
    });
  });
});
