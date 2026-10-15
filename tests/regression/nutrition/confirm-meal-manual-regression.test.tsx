/**
 * Issue #24 — the new photo item-row layout (screen 15a) must not break the existing manual/
 * barcode/label_ocr confirm funnel (acceptance criterion: "Manual entry (no photo) still works").
 * This also reproduces and fixes the eyebrow bug named in the issue's "Current behavior": "The
 * eyebrow uses the clock meal (`ConfirmMealScreen.tsx:122`) even if the user picks another chip" —
 * it must track the chip actually selected, not `currentMealByClock()`.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ConfirmMealScreen from '@/features/nutrition/screens/ConfirmMealScreen';

const mockBack = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockCreateEntryMutate = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
  useCreateFoodEntryMutation: () => ({ mutate: mockCreateEntryMutate, isPending: false }),
  useCreateFoodEntriesMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

function renderManualConfirm() {
  mockSearchParams = {
    source: 'manual',
    prefill: JSON.stringify({ food_name: 'Protein bar' }),
  };
  return render(<ConfirmMealScreen />);
}

describe('nutrition: ConfirmMealScreen manual entry regression (issue #24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('still renders the aggregate form (name field, 4 meal chips, 4 macro fields) for manual entry', () => {
    renderManualConfirm();

    expect(screen.getByPlaceholderText('e.g. Rice bowl with paneer')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Breakfast' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lunch' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dinner' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Snack' })).toBeTruthy();
    expect(screen.getByText(/Calories/)).toBeTruthy();
    expect(screen.getByText(/Protein/)).toBeTruthy();
    expect(screen.getByText(/Carbs/)).toBeTruthy();
    expect(screen.getByText(/Fat/)).toBeTruthy();
    // The photo-only per-item copy must not appear here.
    expect(screen.queryByText('Correct me once. I never make the same mistake twice.')).toBeNull();
  });

  it('eyebrow follows the selected meal chip, not the wall clock', () => {
    renderManualConfirm();

    fireEvent.press(screen.getByRole('button', { name: 'Dinner' }));
    expect(screen.getByText('Logged · Dinner')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Breakfast' }));
    expect(screen.getByText('Logged · Breakfast')).toBeTruthy();
  });

  it('saves exactly one entry with no ai_guess when confirming manually', async () => {
    renderManualConfirm();

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Rice bowl with paneer'), 'Protein bar');
    const macroFields = screen.getAllByPlaceholderText('0');
    macroFields.forEach((field) => fireEvent.changeText(field, '10'));

    fireEvent.press(screen.getByRole('button', { name: /Looks right|Save/ }));

    await waitFor(() => expect(mockCreateEntryMutate).toHaveBeenCalledTimes(1));
    const [payload] = mockCreateEntryMutate.mock.calls[0];
    expect(payload.source).toBe('manual');
    expect(payload.ai_guess).toBeUndefined();
  });
});
