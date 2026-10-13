/**
 * Issue #35 — design screen 30a ("Swap dinner? ... Tell me what you'd rather have, or just pick
 * one.", design-spec.md lines 7-88). Today `MealDetailScreen`'s `ReplaceSheet` shows a different
 * title ("Swap this meal"), a different placeholder ("e.g. no dairy, less cooking, more protein"),
 * a separate "Show swaps" button, and rows with only "{kcal} kcal · {protein}g protein" — none of
 * which matches the design. This protects the new `ReplacePromptSheet`'s exact copy for both the
 * empty-options and has-options states, its reason line (the alternative's `rationale` with the
 * backend's literal "Approx. " prefix stripped — see `replace-preview-lib.test.ts`), and its 503
 * handling (`apps/meals/views.py:451-454`, not handled anywhere today).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ReplacePromptSheet } from '@/features/nutrition/components/ReplacePromptSheet';
import { spacing } from '@/shared/theme/tokens';
import type { ReplacePreviewAlternative } from '@/shared/types/mealPlan';

function alt(name: string, rationale: string, calories_kcal: number): ReplacePreviewAlternative {
  return {
    meal_type: 'dinner',
    name,
    calories_kcal,
    protein_g: 30,
    carbs_g: 40,
    fat_g: 10,
    rationale,
    serving_size: '1 plate',
    prep_time_minutes: 20,
    estimated_cost_tier: 'moderate',
    ingredients: [{ item: 'Tofu', quantity: '150g' }],
    nutrition_source: 'food_records',
    nutrition_trace: [],
  };
}

const THREE_ALTERNATIVES: ReplacePreviewAlternative[] = [
  alt('Grilled chicken, quinoa, broccoli', 'Approx. Lighter, more protein', 580),
  alt('Tofu stir-fry, brown rice', "Approx. Closest match to tonight's macros", 610),
  alt('Egg curry, two rotis', 'Approx. Budget-friendly, quick to cook', 560),
];

function renderSheet(overrides: Partial<React.ComponentProps<typeof ReplacePromptSheet>> = {}) {
  const props: React.ComponentProps<typeof ReplacePromptSheet> = {
    visible: true,
    preference: '',
    onPreference: jest.fn(),
    onSubmit: jest.fn(),
    loading: false,
    alternatives: THREE_ALTERNATIVES,
    quotaError: null,
    serviceUnavailable: false,
    onPick: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  render(<ReplacePromptSheet {...props} />);
  return props;
}

describe('nutrition: ReplacePromptSheet (issue #35, design 30a)', () => {
  it('always shows the design title', () => {
    renderSheet();
    expect(screen.getByText('Swap dinner?')).toBeTruthy();
  });

  it('shows a loading state in place of the list while fetching', () => {
    renderSheet({ alternatives: null, loading: true });
    expect(screen.getByTestId('replace-prompt-loading')).toBeTruthy();
    expect(screen.queryByText("Tell me what you'd rather have, or just pick one.")).toBeNull();
  });

  describe('empty state (no alternatives survived)', () => {
    it('shows the empty copy and "Keep tonight\'s plan"', () => {
      renderSheet({ alternatives: [] });
      expect(screen.getByText("Nothing I'd swap in tonight.")).toBeTruthy();
      expect(
        screen.getByText(
          "Nothing on hand fit your goals or your allergy note tonight. Tonight's plan stays as is — or tell me what you're in the mood for and I'll look again.",
        ),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: "Keep tonight's plan" })).toBeTruthy();
    });

    it('closes the sheet when the user keeps the plan', () => {
      const { onClose } = renderSheet({ alternatives: [] });
      fireEvent.press(screen.getByRole('button', { name: "Keep tonight's plan" }));
      expect(onClose).toHaveBeenCalled();
    });

    it('still shows the preference input so the user can look again', () => {
      renderSheet({ alternatives: [] });
      expect(screen.getByPlaceholderText('e.g. something with less rice')).toBeTruthy();
    });

    it('keeps the empty-state heading at the design subtitle gap below the title', () => {
      renderSheet({ alternatives: [] });

      const headingStyle = StyleSheet.flatten(
        screen.getByText("Nothing I'd swap in tonight.").props.style,
      );
      expect(headingStyle.marginTop).toBe(spacing.sheetSubtitleGap);
    });
  });

  describe('has-options state', () => {
    it('shows the has-options subtitle and placeholder', () => {
      renderSheet();
      expect(screen.getByText("Tell me what you'd rather have, or just pick one.")).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. something with less rice')).toBeTruthy();
    });

    it('renders each alternative with its name, stripped reason, and raw kcal number', () => {
      renderSheet();
      expect(screen.getByText('Grilled chicken, quinoa, broccoli')).toBeTruthy();
      expect(screen.getByText('Lighter, more protein')).toBeTruthy();
      expect(screen.getByText('580')).toBeTruthy();

      expect(screen.getByText('Tofu stir-fry, brown rice')).toBeTruthy();
      expect(screen.getByText("Closest match to tonight's macros")).toBeTruthy();
      expect(screen.getByText('610')).toBeTruthy();

      expect(screen.getByText('Egg curry, two rotis')).toBeTruthy();
      expect(screen.getByText('Budget-friendly, quick to cook')).toBeTruthy();
      expect(screen.getByText('560')).toBeTruthy();
    });

    it('never shows the literal "Approx." prefix anywhere', () => {
      renderSheet();
      expect(screen.queryByText(/Approx\./)).toBeNull();
    });

    it('tapping a row calls onPick with its index', () => {
      const { onPick } = renderSheet();
      fireEvent.press(screen.getByRole('button', { name: /Tofu stir-fry, brown rice/ }));
      expect(onPick).toHaveBeenCalledWith(1);
    });

    it('submitting the input (keyboard "done") calls onSubmit', () => {
      const { onSubmit } = renderSheet({ preference: 'less rice' });
      fireEvent(screen.getByPlaceholderText('e.g. something with less rice'), 'onSubmitEditing');
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('shows the existing quota banner on a 429, not a crash', () => {
    renderSheet({
      alternatives: null,
      quotaError: {
        error: 'quota_exceeded',
        action: 'replace_preview',
        message: 'You have reached your daily meal-swap limit.',
        limit: 5,
        tier: 'free',
        quota_resets_at: new Date().toISOString(),
      },
    });
    expect(screen.getByText('You have reached your daily meal-swap limit.')).toBeTruthy();
  });

  it('shows calm, non-crashing copy and a retry on a 503', () => {
    const { onSubmit } = renderSheet({ alternatives: null, serviceUnavailable: true });
    expect(screen.getByText(/taking a moment/i)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
