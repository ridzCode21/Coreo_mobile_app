/**
 * Issue #26, design 21c "Label scan result" (design-spec.md lines 7-117). Reached from
 * `LogMealSheet` after a successful `POST /food/label-ocr/` (see log-meal-sheet.test.tsx). Shows
 * the label's own per-serving macros (never scaled display text — "10g per serving" etc. are the
 * label's fixed numbers), a servings control that scales the TOTAL logged (not the per-serving
 * copy), and "Looks right" which is the only place this flow calls `POST /food/entries/`.
 *
 * Per Decision log in plan.md: the per-macro −/+ steppers and the servings chip all drive the SAME
 * shared multiplier (there is no independent per-macro "Fix" on this screen, unlike the photo
 * review flow) — "scales straight off the label, no estimating" rules out inventing an edited
 * macro value. The submitted entry never carries `ai_guess`: because every field (portion_g,
 * calories, macros) is intentionally scaled by the chosen servings, including `ai_guess` would
 * make `apps/food_tracking/services/ai_guess.py:_differs()` treat ordinary serving scaling as a
 * "correction" and corrupt future label reads for the same product name
 * (`apply_remembered_label_correction`, `apps/food_tracking/views.py:317`).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import LabelResultScreen from '@/app/(app)/(tabs)/diet/label-result';

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => mockParams(),
}));

let paramsOverride: Record<string, string | undefined> = {};
function mockParams() {
  return paramsOverride;
}

const mockMutate = jest.fn();
let mockPending = false;
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-15',
  useCreateFoodEntryMutation: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

const ESTIMATE = {
  name: 'Clif Bar, Chocolate Chip',
  portion_grams: 68,
  est_calories: 250,
  est_protein_g: 10,
  est_carbs_g: 44,
  est_fat_g: 7,
  servings_per_container: 2.5,
  confidence: 0.95,
  guessed: false,
  guess_note: null,
  remembered: false,
};

function setPrefill(estimate: Record<string, unknown> | null) {
  paramsOverride = estimate ? { prefill: JSON.stringify(estimate) } : {};
}

describe('nutrition: LabelResultScreen (issue #26, design 21c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPending = false;
    setPrefill(ESTIMATE);
  });

  it('shows a calm fallback and a way back to Diet when the prefill is missing or invalid', () => {
    setPrefill(null);
    render(<LabelResultScreen />);
    expect(screen.queryByText('Clif Bar, Chocolate Chip')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: /back to diet/i }));
    expect(mockReplace).toHaveBeenCalledWith('/diet');
  });

  it('renders the exact design copy and the product/calorie header', () => {
    render(<LabelResultScreen />);
    expect(screen.getByText('Label · Snack')).toBeTruthy();
    expect(screen.getByText(/Read it straight off the panel\./)).toBeTruthy();
    expect(screen.getByText('Clif Bar, Chocolate Chip')).toBeTruthy();
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.getByText('How much did you eat?')).toBeTruthy();
    expect(
      screen.getByText(
        "Sodium, fiber, sugar aren't tracked in v1 — calories, protein, carbs, fat only.",
      ),
    ).toBeTruthy();
    expect(screen.getByText('Correct me once. I never make the same mistake twice.')).toBeTruthy();
  });

  it("shows the label's fixed per-serving macro text for all three tracked macros", () => {
    render(<LabelResultScreen />);
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('10g per serving')).toBeTruthy();
    expect(screen.getByText('Carbs')).toBeTruthy();
    expect(screen.getByText('44g per serving')).toBeTruthy();
    expect(screen.getByText('Fat')).toBeTruthy();
    expect(screen.getByText('7g per serving')).toBeTruthy();
  });

  it('only shows the low-confidence notice when the estimate was guessed', () => {
    render(<LabelResultScreen />);
    expect(screen.queryByText("Couldn't read it clearly. Check the numbers.")).toBeNull();

    setPrefill({ ...ESTIMATE, guessed: true });
    render(<LabelResultScreen />);
    expect(screen.getByText("Couldn't read it clearly. Check the numbers.")).toBeTruthy();
  });

  it('defaults the servings chip to "1 serving" and names the container size', () => {
    render(<LabelResultScreen />);
    expect(screen.getByText('1 serving')).toBeTruthy();
    expect(screen.getByText('Container has 2.5 servings · defaults to 1')).toBeTruthy();
  });

  it('the per-macro steppers all drive the one shared servings multiplier', () => {
    render(<LabelResultScreen />);
    fireEvent.press(screen.getByRole('button', { name: /increase protein servings/i }));
    expect(screen.getByText('1.1 servings')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /increase carbs servings/i }));
    expect(screen.getByText('1.2 servings')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: /decrease fat servings/i }));
    expect(screen.getByText('1.1 servings')).toBeTruthy();
  });

  it('clamps the servings multiplier to [1, servings_per_container] — never below one or above the container', () => {
    render(<LabelResultScreen />);
    fireEvent.press(screen.getByRole('button', { name: /decrease protein servings/i }));
    expect(screen.getByText('1 serving')).toBeTruthy(); // was already at the floor

    for (let tap = 0; tap < 20; tap += 1) {
      fireEvent.press(screen.getByRole('button', { name: /increase protein servings/i }));
    }
    expect(screen.getByText('2.5 servings')).toBeTruthy(); // clamped at the container size
  });

  it('opens the "how many servings" sheet (21d) when the servings chip is pressed', () => {
    render(<LabelResultScreen />);
    expect(screen.queryByText('How many servings?')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: /how much did you eat/i }));
    expect(screen.getByText('How many servings?')).toBeTruthy();
  });

  it('submits a single scaled entry with source label_ocr and no ai_guess, then returns to Diet', async () => {
    mockMutate.mockImplementation((_values, handlers) => handlers.onSuccess());
    render(<LabelResultScreen />);

    fireEvent.press(screen.getByRole('button', { name: /increase protein servings/i })); // 1.1x

    fireEvent.press(screen.getByRole('button', { name: 'Looks right' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    const [values] = mockMutate.mock.calls[0];
    expect(values).toEqual(
      expect.objectContaining({
        food_name: 'Clif Bar, Chocolate Chip',
        source: 'label_ocr',
        portion_g: 74.8, // 68 * 1.1
        calories: 275, // 250 * 1.1
        protein_g: 11,
        carbs_g: 48.4,
        fat_g: 7.7,
      }),
    );
    expect(values.ai_guess).toBeUndefined();
    expect(mockReplace).toHaveBeenCalledWith('/diet');
  });

  it('shows a calm retry message and does not navigate when saving fails', async () => {
    mockMutate.mockImplementation((_values, handlers) => handlers.onError());
    render(<LabelResultScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Looks right' }));

    await waitFor(() =>
      expect(
        screen.getByText("That didn't save — check your connection and try again."),
      ).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
