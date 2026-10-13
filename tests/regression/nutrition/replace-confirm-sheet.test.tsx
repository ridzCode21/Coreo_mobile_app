/**
 * Issue #35 — design screen 30b, the confirm step that does not exist in the app today
 * (design-spec.md lines 98-146: "Confirm the swap", "Replacing dinner", a ticking "Expires in
 * M:SS", the chosen meal's name, the delta line, "Confirm swap", "Choose a different one"). The
 * countdown is computed client-side from the preview token's 600s TTL
 * (`apps/core/services/assistant_dispatcher.py:36`) — never from the API, which has no expiry
 * field — and must proactively show an expired state once it reaches zero (acceptance criterion
 * 3), not only after a 404 from the real confirm call.
 */

import { act, render, screen, fireEvent } from '@testing-library/react-native';

import { ReplaceConfirmSheet } from '@/features/nutrition/components/ReplaceConfirmSheet';
import type { ReplacePreviewAlternative } from '@/shared/types/mealPlan';

const ALTERNATIVE: ReplacePreviewAlternative = {
  meal_type: 'dinner',
  name: 'Tofu stir-fry, brown rice',
  calories_kcal: 610,
  protein_g: 34,
  carbs_g: 58,
  fat_g: 20,
  rationale: "Approx. Closest match to tonight's macros.",
  serving_size: '1 plate',
  prep_time_minutes: 20,
  estimated_cost_tier: 'moderate',
  ingredients: [{ item: 'Tofu', quantity: '150g' }],
  nutrition_source: 'food_records',
  nutrition_trace: [],
};

const ORIGINAL = { calories_kcal: 570, carbs_g: 66 };

function renderSheet(overrides: Partial<React.ComponentProps<typeof ReplaceConfirmSheet>> = {}) {
  const props: React.ComponentProps<typeof ReplaceConfirmSheet> = {
    visible: true,
    mealTypeLabel: 'dinner',
    original: ORIGINAL,
    alternative: ALTERNATIVE,
    expiresAt: Date.now() + 522_000,
    busy: false,
    onConfirm: jest.fn(),
    onChooseDifferent: jest.fn(),
    onTryAgain: jest.fn(),
    ...overrides,
  };
  render(<ReplaceConfirmSheet {...props} />);
  return props;
}

describe('nutrition: ReplaceConfirmSheet (issue #35, design 30b)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the design title and the meal-type eyebrow', () => {
    renderSheet();
    expect(screen.getByText('Confirm the swap')).toBeTruthy();
    expect(screen.getByText('Replacing dinner')).toBeTruthy();
  });

  it('generalizes the eyebrow to whatever meal type is passed in', () => {
    renderSheet({ mealTypeLabel: 'lunch' });
    expect(screen.getByText('Replacing lunch')).toBeTruthy();
  });

  it('shows the chosen meal name and the exact delta line', () => {
    renderSheet();
    expect(screen.getByText('Tofu stir-fry, brown rice')).toBeTruthy();
    expect(screen.getByText('610 kcal · +40 vs original · 8g less carbs')).toBeTruthy();
  });

  it('shows the countdown and ticks it down every second', () => {
    renderSheet({ expiresAt: Date.now() + 522_000 });
    expect(screen.getByText('Expires in 8:42')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Expires in 8:41')).toBeTruthy();
  });

  it('shows "Confirm swap" and "Choose a different one", wired to their callbacks', () => {
    const { onConfirm, onChooseDifferent } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Confirm swap' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Choose a different one' }));
    expect(onChooseDifferent).toHaveBeenCalled();
  });

  it('disables "Confirm swap" while busy', () => {
    renderSheet({ busy: true });
    expect(screen.getByRole('button', { name: 'Confirm swap' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('uses a straight apostrophe in the calm retry copy', () => {
    renderSheet({ error: true });
    expect(
      screen.getByText("That swap didn't go through. Your plan is unchanged — try again."),
    ).toBeTruthy();
  });

  describe('expired (countdown reaches zero before the user confirms)', () => {
    it('shows an expired message and a "Try again" action instead of Confirm', () => {
      renderSheet({ expiresAt: Date.now() - 1_000 });
      expect(screen.getByText(/expired/i)).toBeTruthy();
      expect(
        screen.getByText("Your plan is unchanged. Ask for fresh options when you're ready."),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Confirm swap' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    });

    it('becomes expired once the live countdown ticks down to zero', () => {
      renderSheet({ expiresAt: Date.now() + 1_000 });
      expect(screen.queryByText(/expired/i)).toBeNull();

      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      expect(screen.getByText(/expired/i)).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Confirm swap' })).toBeNull();
    });

    it('"Try again" calls onTryAgain', () => {
      const { onTryAgain } = renderSheet({ expiresAt: Date.now() - 1_000 });
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(onTryAgain).toHaveBeenCalled();
    });
  });
});
