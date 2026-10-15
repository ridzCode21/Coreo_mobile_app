/**
 * Issue #25 — "After the snap screens for photo and receipt." 21b (design-spec.md lines 89-178) is
 * shown after a photo meal is saved: the saved totals, one row per item (guessed items show
 * "· my guess" + Fix instead of a calorie number), and "Leaves N for {meal}." where N is the day's
 * remaining calories from `GET /food/entries/`'s `macro_summary.calories.remaining`
 * (`apps/insights/services.py:196-224`) — never a client-invented number, so it must read `—` until
 * that query actually has data.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

import PhotoReceiptScreen from '@/features/nutrition/screens/PhotoReceiptScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams,
}));

let mockFoodEntriesResult: {
  data: { macro_summary: { calories: { remaining: number } } } | undefined;
  isLoading: boolean;
  isError: boolean;
};
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
  useFoodEntriesQuery: () => mockFoodEntriesResult,
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

const PANEER = {
  name: 'Paneer, pan-fried',
  portion_label: '80g',
  portion_grams: 80,
  est_calories: 235,
  est_protein_g: 14,
  est_carbs_g: 4,
  est_fat_g: 18,
  confidence: 0.88,
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

const GREENS = {
  name: 'Sautéed greens',
  portion_label: '1 cup',
  portion_grams: 100,
  est_calories: 80,
  est_protein_g: 3,
  est_carbs_g: 8,
  est_fat_g: 4,
  confidence: 0.95,
  guessed: false,
  guess_note: null,
  remembered: false,
};

function renderReceipt() {
  mockSearchParams = {
    summary: JSON.stringify({
      food_name: 'Rice bowl, paneer, greens',
      calories: 640,
      protein_g: 32,
      carbs_g: 74,
      fat_g: 22,
      meal_type: 'lunch',
      items: [STEAMED_RICE, PANEER, DRESSING, GREENS],
    }),
  };
  return render(<PhotoReceiptScreen />);
}

describe('nutrition: PhotoReceiptScreen (21b, issue #25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFoodEntriesResult = { data: undefined, isLoading: true, isError: false };
  });

  it('shows the saved meal totals and macro pills with exact design copy', () => {
    renderReceipt();

    expect(screen.getByText('Logged · Lunch')).toBeTruthy();
    expect(screen.getByText('Rice bowl, paneer, greens')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.getByText('P 32g')).toBeTruthy();
    expect(screen.getByText('C 74g')).toBeTruthy();
    expect(screen.getByText('F 22g')).toBeTruthy();
  });

  it('shows one row per item: a calorie number for identified items, "· my guess" + Fix for the guessed one', () => {
    renderReceipt();

    expect(screen.getByText('Steamed rice · 1 cup')).toBeTruthy();
    expect(screen.getByText('205')).toBeTruthy();
    expect(screen.getByText('Paneer, pan-fried · 80g')).toBeTruthy();
    expect(screen.getByText('235')).toBeTruthy();
    expect(screen.getByText('Sautéed greens · 1 cup')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();

    expect(screen.getByText('Dressing · my guess')).toBeTruthy();
    // The guessed row shows Fix instead of a number — its calorie value (135) is never rendered as text.
    expect(screen.queryByText('135')).toBeNull();
  });

  it('shows "—" for the remaining calories while the daily summary is still loading — never an invented number', () => {
    mockFoodEntriesResult = { data: undefined, isLoading: true, isError: false };
    renderReceipt();

    expect(screen.getByText(/Leaves — for dinner\. Right on plan\./)).toBeTruthy();
  });

  it('shows "—" when the daily summary query errored, rather than guessing a number', () => {
    mockFoodEntriesResult = { data: undefined, isLoading: false, isError: true };
    renderReceipt();

    expect(screen.getByText(/Leaves — for dinner\. Right on plan\./)).toBeTruthy();
  });

  it('shows the real remaining-calories number once the daily summary loads, worded for the next meal (lunch -> dinner)', async () => {
    mockFoodEntriesResult = {
      data: { macro_summary: { calories: { remaining: 600 } } },
      isLoading: false,
      isError: false,
    };
    renderReceipt();

    await waitFor(() =>
      expect(screen.getByText('Leaves 600 for dinner. Right on plan.')).toBeTruthy(),
    );
  });

  it('"Fix one thing" pushes to Check My Math (/diet/confirm) with the same items', () => {
    mockFoodEntriesResult = {
      data: { macro_summary: { calories: { remaining: 600 } } },
      isLoading: false,
      isError: false,
    };
    renderReceipt();

    fireEvent.press(screen.getByRole('button', { name: 'Fix one thing' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/confirm');
    expect(pushedUrl).toContain('source=photo');
    const prefill = JSON.parse(new URLSearchParams(pushedUrl.split('?')[1]).get('prefill')!);
    expect(prefill.items).toEqual([STEAMED_RICE, PANEER, DRESSING, GREENS]);
  });

  it('the per-row "Fix" on the guessed item also pushes to Check My Math', () => {
    mockFoodEntriesResult = {
      data: { macro_summary: { calories: { remaining: 600 } } },
      isLoading: false,
      isError: false,
    };
    renderReceipt();

    fireEvent.press(screen.getByRole('button', { name: 'Fix Dressing' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(String(mockPush.mock.calls[0][0])).toContain('/diet/confirm');
  });

  it('"Looks right" replaces route to diet home, dismissing the receipt', () => {
    mockFoodEntriesResult = {
      data: { macro_summary: { calories: { remaining: 600 } } },
      isLoading: false,
      isError: false,
    };
    renderReceipt();

    fireEvent.press(screen.getByRole('button', { name: /Looks right/ }));

    expect(mockReplace).toHaveBeenCalledWith('/diet');
  });
});
