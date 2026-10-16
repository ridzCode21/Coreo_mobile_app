import { fireEvent, render, screen } from '@testing-library/react-native';

import { PlanAssistantFlow } from '@/features/nutrition/components/PlanAssistantFlow';

const mockAssistantMutate = jest.fn();
const mockConfirmMutate = jest.fn();

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useAssistantMutation: () => ({ mutate: mockAssistantMutate, isPending: false, error: null }),
  useAssistantConfirmMutation: () => ({
    mutate: mockConfirmMutate,
    isPending: false,
    error: null,
  }),
}));

beforeEach(() => {
  mockAssistantMutate.mockReset();
  mockConfirmMutate.mockReset();
});

describe('PlanAssistantFlow', () => {
  it('runs the selected live prompt and opens its recipe response', () => {
    mockAssistantMutate.mockImplementation(
      (_promptId: number, options: { onSuccess: (response: unknown) => void }) => {
        options.onSuccess({
          recipe: {
            name: 'Fast paneer bowl',
            servings: '1 serving',
            steps: [{ step: 1, instruction: 'Warm the paneer' }],
            ingredients: [],
            prep_time_minutes: 10,
            cook_time_minutes: 5,
            nutrition_note: '',
            checked_nutrition: {
              calories_kcal: 420,
              protein_g: 28,
              carbs_g: 36,
              fat_g: 18,
              source: 'food_records',
              trace: [],
            },
          },
        });
      },
    );

    render(<PlanAssistantFlow date="2026-10-16" promptId={7} onClose={jest.fn()} />);

    expect(mockAssistantMutate).toHaveBeenCalledWith(7, expect.any(Object));
    expect(screen.getByText('Fast paneer bowl')).toBeTruthy();
  });

  it('opens a proposal and confirms it through the existing confirm mutation', () => {
    mockAssistantMutate.mockImplementation(
      (_promptId: number, options: { onSuccess: (response: unknown) => void }) => {
        options.onSuccess({ proposal_id: 'proposal-1', summary: 'Swap dinner for dal' });
      },
    );

    render(<PlanAssistantFlow date="2026-10-16" promptId={8} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText('Confirm'));

    expect(mockConfirmMutate).toHaveBeenCalledWith('proposal-1', expect.any(Object));
  });
});
