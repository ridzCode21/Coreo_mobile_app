/**
 * Issue #24 — "Check my math shows editable items and teaches the backend." After a photo, the
 * design (screen 15a, design-spec.md lines 1-70) shows each food as its own editable row — not the
 * single aggregate form `ConfirmMealScreen.tsx` renders today (`:125-191`). This is the core contract
 * for the issue: per-item rows with exact design copy, the "remembered"/"Fix" states, steppers that
 * edit the displayed math, and — the actual bug the issue is about — each saved item sends its own
 * `ai_guess` so the backend can learn the correction
 * (`apps/food_tracking/serializers.py:28-48` AiGuessSerializer is a single-item shape;
 * `apps/food_tracking/views.py:212-213` + `apps/food_tracking/services/ai_guess.py:26-52` only learn
 * anything when `ai_guess` is present and differs from the saved entry).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import ConfirmMealScreen from '@/features/nutrition/screens/ConfirmMealScreen';

const mockBack = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
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

const GHEE = {
  name: 'Ghee',
  portion_label: '1 tbsp',
  portion_grams: 14,
  est_calories: 135,
  est_protein_g: 0,
  est_carbs_g: 0,
  est_fat_g: 15,
  confidence: 1,
  guessed: false,
  guess_note: null,
  remembered: true,
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

const ITEMS = [STEAMED_RICE, PANEER, GHEE, GREENS];

function renderPhotoConfirm() {
  mockSearchParams = {
    source: 'photo',
    prefill: JSON.stringify({
      food_name: 'Rice bowl, paneer, greens',
      meal_type: 'lunch',
      calories: 640,
      protein_g: 32,
      carbs_g: 74,
      fat_g: 22,
      items: ITEMS,
    }),
  };
  return render(<ConfirmMealScreen />);
}

describe('nutrition: ConfirmMealScreen photo item rows (issue #24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the eyebrow, headline, summary card and all 4 item rows with exact design copy', () => {
    renderPhotoConfirm();

    expect(screen.getByText('Logged · Lunch')).toBeTruthy();
    expect(screen.getByText(/Here's what I saw\.?/)).toBeTruthy();
    expect(screen.getByText(/Check my math\.?/)).toBeTruthy();

    expect(screen.getByText('Rice bowl, paneer, greens')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.getByText('P 32g · C 74g · F 22g, every line below is editable')).toBeTruthy();

    expect(screen.getByText('Steamed rice')).toBeTruthy();
    expect(screen.getByText('1 cup · 205 kcal')).toBeTruthy();
    expect(screen.getByText('Paneer, pan-fried')).toBeTruthy();
    expect(screen.getByText('80g · 235 kcal')).toBeTruthy();
    expect(screen.getByText('Ghee')).toBeTruthy();
    expect(screen.getByText('1 tbsp · 135 kcal')).toBeTruthy();
    expect(screen.getByText('Sautéed greens')).toBeTruthy();
    expect(screen.getByText('1 cup · 80 kcal')).toBeTruthy();

    expect(screen.getByText('Correct me once. I never make the same mistake twice.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Looks right/ })).toBeTruthy();
  });

  it('shows "From your fix last time" and "Fix" only on the remembered item (Ghee)', () => {
    renderPhotoConfirm();

    expect(screen.getByText('From your fix last time')).toBeTruthy();
    expect(screen.getAllByText('Fix')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Fix Ghee' })).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Fix Steamed rice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fix Paneer, pan-fried' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fix Sautéed greens' })).toBeNull();
  });

  it('tapping "+" raises the displayed kcal for that item without touching its portion label', () => {
    renderPhotoConfirm();

    fireEvent.press(screen.getByRole('button', { name: 'Increase Steamed rice' }));

    // 205 * 1.1 = 225.5 -> rounds to 226 (same round-a-multiplier rule as portionEstimate.ts).
    expect(screen.getByText('1 cup · 226 kcal')).toBeTruthy();
    // The other rows are untouched.
    expect(screen.getByText('80g · 235 kcal')).toBeTruthy();
  });

  it('tapping "−" lowers the displayed kcal and never goes below the 0.1x floor', () => {
    renderPhotoConfirm();

    const decrease = screen.getByRole('button', { name: 'Decrease Sautéed greens' });
    for (let i = 0; i < 20; i += 1) {
      fireEvent.press(decrease);
    }

    // Floored at 0.1x of 80 kcal = 8 kcal, never 0 or negative.
    expect(screen.getByText('1 cup · 8 kcal')).toBeTruthy();
  });

  it('tapping "Fix" turns the item name into an editable field prefilled with the current name', () => {
    renderPhotoConfirm();

    fireEvent.press(screen.getByRole('button', { name: 'Fix Ghee' }));

    const input = screen.getByLabelText('Ghee name');
    expect(input.props.value).toBe('Ghee');

    fireEvent.changeText(input, 'Butter');
    expect(screen.getByLabelText('Butter name').props.value).toBe('Butter');
  });

  it('"Looks right" saves one entry per item, each with its ORIGINAL ai_guess even after edits', async () => {
    mockCreateEntriesMutateAsync.mockResolvedValue(undefined);
    renderPhotoConfirm();

    // Edit two of the four items before saving.
    fireEvent.press(screen.getByRole('button', { name: 'Increase Steamed rice' }));
    fireEvent.press(screen.getByRole('button', { name: 'Fix Ghee' }));
    fireEvent.changeText(screen.getByLabelText('Ghee name'), 'Butter');

    fireEvent.press(screen.getByRole('button', { name: /Looks right/ }));

    await waitFor(() => expect(mockCreateEntriesMutateAsync).toHaveBeenCalledTimes(1));
    const entries = mockCreateEntriesMutateAsync.mock.calls[0][0] as {
      meal_type: string;
      source: string;
      food_name: string;
      calories: number;
      ai_guess: Record<string, unknown>;
    }[];
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.meal_type === 'lunch')).toBe(true);
    expect(entries.every((entry) => entry.source === 'photo')).toBe(true);

    const rice = entries.find((entry) => entry.food_name === 'Steamed rice')!;
    expect(rice.calories).toBe(226); // edited (stepped) value
    expect(rice.ai_guess).toEqual({
      name: 'Steamed rice',
      portion_grams: 150,
      est_calories: 205, // original, unedited guess — not the scaled 226
      est_protein_g: 4,
      est_carbs_g: 45,
      est_fat_g: 1,
      confidence: 0.92,
    });

    const butter = entries.find((entry) => entry.food_name === 'Butter')!;
    expect(butter.ai_guess).toMatchObject({ name: 'Ghee', est_calories: 135 });

    const paneer = entries.find((entry) => entry.food_name === 'Paneer, pan-fried')!;
    expect(paneer.calories).toBe(235); // untouched item saves its unscaled value
    expect(paneer.ai_guess).toMatchObject({ name: 'Paneer, pan-fried' });
  });
});
