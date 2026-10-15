/**
 * Issue #25 — "After the snap screens for photo and receipt." Before this issue, saving from Check
 * My Math (`ConfirmMealScreen`'s `PhotoReview.submit()`, built in #24) called `router.back()` on
 * success — straight back to diet home. The design's 21b receipt must show after ANY successful
 * photo save, not just 21a's direct "Looks right" — including the "Fix" detour through Check My
 * Math. This protects that `PhotoReview.submit()` now replaces route to `/diet/receipt` with the
 * saved totals instead of going back.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ConfirmMealScreen from '@/features/nutrition/screens/ConfirmMealScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockCreateEntriesMutateAsync = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
  useCreateFoodEntryMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateFoodEntriesMutation: () => ({
    mutateAsync: mockCreateEntriesMutateAsync,
    isPending: false,
  }),
}));

const STEAMED_RICE = {
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
};

const DRESSING = {
  name: 'Dressing',
  portion_label: null,
  portion_grams: 14,
  est_calories: 135,
  est_protein_g: 0,
  est_carbs_g: 0,
  est_fat_g: 15,
  confidence: 0.5,
  guessed: true,
  guess_note: 'The dressing. Ghee or oil changes 90 kcal.',
  remembered: false,
};

function renderPhotoConfirm() {
  mockSearchParams = {
    source: 'photo',
    prefill: JSON.stringify({
      food_name: 'Rice bowl, paneer, greens',
      meal_type: 'lunch',
      calories: 340,
      protein_g: 4,
      carbs_g: 45,
      fat_g: 16,
      items: [STEAMED_RICE, DRESSING],
    }),
  };
  return render(<ConfirmMealScreen />);
}

describe('nutrition: ConfirmMealScreen photo save hands off to the receipt (issue #25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces route to /diet/receipt (not router.back()) after a successful save', async () => {
    mockCreateEntriesMutateAsync.mockResolvedValue(undefined);
    renderPhotoConfirm();

    fireEvent.press(screen.getByRole('button', { name: /Looks right/ }));

    await waitFor(() => expect(mockCreateEntriesMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockBack).not.toHaveBeenCalled();

    const replacedUrl = String(mockReplace.mock.calls[0][0]);
    expect(replacedUrl).toContain('/diet/receipt');
    const summary = JSON.parse(new URLSearchParams(replacedUrl.split('?')[1]).get('summary')!);
    expect(summary.food_name).toBe('Rice bowl, paneer, greens');
    expect(summary.meal_type).toBe('lunch');
    expect(summary.items).toEqual([STEAMED_RICE, DRESSING]);
  });

  it('does not navigate anywhere if the save fails', async () => {
    mockCreateEntriesMutateAsync.mockRejectedValue(new Error('network down'));
    renderPhotoConfirm();

    fireEvent.press(screen.getByRole('button', { name: /Looks right/ }));

    await waitFor(() =>
      expect(
        screen.getByText("That didn't save — check your connection and try again."),
      ).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
