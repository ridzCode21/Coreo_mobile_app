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
            title: 'Fast paneer bowl',
            steps: ['Warm the paneer'],
            ingredients: [],
            prep_time_minutes: 10,
            note: '',
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
