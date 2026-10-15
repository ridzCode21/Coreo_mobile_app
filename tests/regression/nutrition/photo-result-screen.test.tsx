/**
 * Issue #25 — "After the snap screens for photo and receipt." Today a successful "Snap the plate"
 * photo estimate routes straight to the Check My Math edit form (`LogMealSheet.tsx:163-177`). The
 * design (screen 21a, design-spec.md lines 7-81) instead shows a result screen first: the photo,
 * item chips, the meal summary, and — only when the estimate flagged something uncertain — a
 * "One thing I couldn't see" card whose "Fix" opens Check My Math. "Looks right" saves every item
 * as-is and moves on to the receipt (21b, issue #25's other half).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import PhotoResultScreen from '@/features/nutrition/screens/PhotoResultScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockCreateEntriesMutateAsync = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
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

function renderPhotoResult(items: unknown[], guessedCount: number) {
  mockSearchParams = {
    source: 'photo',
    photoUri: 'file://plate.jpg',
    prefill: JSON.stringify({
      food_name: 'Rice bowl, paneer, greens',
      calories: 640,
      protein_g: 32,
      carbs_g: 74,
      fat_g: 22,
      guessed_count: guessedCount,
      items,
    }),
  };
  return render(<PhotoResultScreen />);
}

describe('nutrition: PhotoResultScreen (21a, issue #25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T13:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the eyebrow, photo badge, item chips and summary with exact design copy', () => {
    renderPhotoResult([STEAMED_RICE, PANEER, DRESSING, GREENS], 1);

    expect(screen.getByText('Logged · Lunch')).toBeTruthy();
    expect(screen.getByText('Your photo')).toBeTruthy();

    expect(screen.getByText('Rice · 1 cup'.replace('Rice', 'Steamed rice'))).toBeTruthy();
    expect(screen.getByText('Paneer, pan-fried · 80g')).toBeTruthy();
    expect(screen.getByText('Sautéed greens · 1 cup')).toBeTruthy();
    // The guessed item renders as a bare "{name}?" chip, no portion.
    expect(screen.getByText('Dressing?')).toBeTruthy();

    expect(screen.getByText('Rice bowl, paneer, greens')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.getByText('P 32g · C 74g · F 22g')).toBeTruthy();
  });

  it('shows the "One thing I couldn\'t see" card with the guessed item\'s note when guessed_count > 0', () => {
    renderPhotoResult([STEAMED_RICE, PANEER, DRESSING, GREENS], 1);

    expect(screen.getByText("One thing I couldn't see")).toBeTruthy();
    expect(screen.getByText('The dressing. Ghee or oil changes 90 kcal.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fix' })).toBeTruthy();
  });

  it('hides the guess-note card entirely when guessed_count is 0 (acceptance criterion 2)', () => {
    const noneGuessed = { ...DRESSING, guessed: false, guess_note: null };
    renderPhotoResult([STEAMED_RICE, PANEER, noneGuessed, GREENS], 0);

    expect(screen.queryByText("One thing I couldn't see")).toBeNull();
    expect(screen.queryByText('The dressing. Ghee or oil changes 90 kcal.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fix' })).toBeNull();
  });

  it('"Fix" pushes to Check My Math (/diet/confirm) with the same items in the prefill', () => {
    renderPhotoResult([STEAMED_RICE, PANEER, DRESSING, GREENS], 1);

    fireEvent.press(screen.getByRole('button', { name: 'Fix' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/confirm');
    expect(pushedUrl).toContain('source=photo');
    const prefill = JSON.parse(new URLSearchParams(pushedUrl.split('?')[1]).get('prefill')!);
    expect(prefill.items).toEqual([STEAMED_RICE, PANEER, DRESSING, GREENS]);
    expect(prefill.food_name).toBe('Rice bowl, paneer, greens');
  });

  it('"Looks right" saves every item as-is and replaces route to the receipt (21b)', async () => {
    mockCreateEntriesMutateAsync.mockResolvedValue(undefined);
    renderPhotoResult([STEAMED_RICE, PANEER, DRESSING, GREENS], 1);

    fireEvent.press(screen.getByRole('button', { name: /Looks right/ }));

    await waitFor(() => expect(mockCreateEntriesMutateAsync).toHaveBeenCalledTimes(1));
    const entries = mockCreateEntriesMutateAsync.mock.calls[0][0] as {
      food_name: string;
      calories: number;
      meal_type: string;
      source: string;
      ai_guess: Record<string, unknown>;
    }[];
    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.meal_type === 'lunch')).toBe(true);
    expect(entries.every((entry) => entry.source === 'photo')).toBe(true);
    // Multiplier 1 — the unedited estimate values are saved verbatim.
    const dressing = entries.find((entry) => entry.food_name === 'Dressing')!;
    expect(dressing.calories).toBe(135);
    expect(dressing.ai_guess).toMatchObject({ name: 'Dressing', est_calories: 135 });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    const replacedUrl = String(mockReplace.mock.calls[0][0]);
    expect(replacedUrl).toContain('/diet/receipt');
  });
});
