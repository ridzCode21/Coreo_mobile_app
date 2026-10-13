/**
 * Issue #35 — design screen 35a, a full-screen compare view that does not exist in the app today
 * (design-spec.md lines 153-230: eyebrow "Swap dinner", a back arrow, the issue's own quoted
 * subtitle "Three that fit tonight — pick one, or keep what's planned." (issue.md:16), each card's
 * full 4-macro line, a "why it fits" reason, a "Use this one" button, and the footer "Only one can
 * be used — the rest fall away."). This protects all of that plus the hand-off from 30a: the index
 * the user tapped there arrives here already highlighted (`selectedIndex`), per the plan's decision
 * that the design's duplicate "selected" row in 30a/35a is one continuous journey, not two
 * independent defaults.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { ReplaceCompareScreen } from '@/features/nutrition/components/ReplaceCompareScreen';
import type { ReplacePreviewAlternative } from '@/shared/types/mealPlan';

function alt(
  name: string,
  rationale: string,
  calories_kcal: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
): ReplacePreviewAlternative {
  return {
    meal_type: 'dinner',
    name,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g,
    rationale,
    serving_size: '1 plate',
    prep_time_minutes: 20,
    estimated_cost_tier: 'moderate',
    ingredients: [{ item: 'Tofu', quantity: '150g' }],
    nutrition_source: 'food_records',
    nutrition_trace: [],
  };
}

const ALTERNATIVES: ReplacePreviewAlternative[] = [
  alt(
    'Grilled chicken, quinoa, broccoli',
    'Approx. Lighter and higher protein than tonight’s plan.',
    580,
    48,
    42,
    18,
  ),
  alt('Tofu stir-fry, brown rice', 'Approx. Closest match to tonight’s macros.', 610, 34, 58, 20),
  alt('Egg curry, two rotis', 'Approx. Budget-friendly, quick to cook tonight.', 560, 28, 60, 22),
];

function renderScreen(overrides: Partial<React.ComponentProps<typeof ReplaceCompareScreen>> = {}) {
  const props: React.ComponentProps<typeof ReplaceCompareScreen> = {
    visible: true,
    alternatives: ALTERNATIVES,
    selectedIndex: 1,
    onUseThisOne: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
  render(<ReplaceCompareScreen {...props} />);
  return props;
}

describe('nutrition: ReplaceCompareScreen (issue #35, design 35a)', () => {
  it('shows the eyebrow and the quoted subtitle', () => {
    renderScreen();
    expect(screen.getByText('Swap dinner')).toBeTruthy();
    expect(
      screen.getByText("Three that fit tonight — pick one, or keep what's planned."),
    ).toBeTruthy();
  });

  it('uses the singular heading and hides the footer for one surviving alternative', () => {
    renderScreen({ alternatives: ALTERNATIVES.slice(0, 1), selectedIndex: 0 });

    expect(
      screen.getByText("One that fits tonight — pick it, or keep what's planned."),
    ).toBeTruthy();
    expect(screen.queryByText('Only one can be used — the rest fall away.')).toBeNull();
  });

  it('uses the two-option heading and keeps the footer for two surviving alternatives', () => {
    renderScreen({ alternatives: ALTERNATIVES.slice(0, 2), selectedIndex: 0 });

    expect(
      screen.getByText("Two that fit tonight — pick one, or keep what's planned."),
    ).toBeTruthy();
    expect(screen.getByText('Only one can be used — the rest fall away.')).toBeTruthy();
  });

  it('calls onBack when the back arrow is pressed', () => {
    const { onBack } = renderScreen();
    fireEvent.press(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders each card with the full 4-macro line and its reason', () => {
    renderScreen();
    expect(screen.getByText('Grilled chicken, quinoa, broccoli')).toBeTruthy();
    expect(screen.getByText('580 kcal · 48g protein · 42g carbs · 18g fat')).toBeTruthy();
    expect(screen.getByText('Lighter and higher protein than tonight’s plan.')).toBeTruthy();

    expect(screen.getByText('Tofu stir-fry, brown rice')).toBeTruthy();
    expect(screen.getByText('610 kcal · 34g protein · 58g carbs · 20g fat')).toBeTruthy();
    expect(screen.getByText('Closest match to tonight’s macros.')).toBeTruthy();

    expect(screen.getByText('Egg curry, two rotis')).toBeTruthy();
    expect(screen.getByText('560 kcal · 28g protein · 60g carbs · 22g fat')).toBeTruthy();
    expect(screen.getByText('Budget-friendly, quick to cook tonight.')).toBeTruthy();
  });

  it('every card shows a "Use this one" button', () => {
    renderScreen();
    expect(screen.getAllByRole('button', { name: 'Use this one' })).toHaveLength(3);
  });

  it('shows the footer line', () => {
    renderScreen();
    expect(screen.getByText('Only one can be used — the rest fall away.')).toBeTruthy();
  });

  it('never shows the literal "Approx." prefix anywhere', () => {
    renderScreen();
    expect(screen.queryByText(/Approx\./)).toBeNull();
  });

  it('calls onUseThisOne with the card’s own index, not always the pre-selected one', () => {
    const { onUseThisOne } = renderScreen({ selectedIndex: 1 });
    const buttons = screen.getAllByRole('button', { name: 'Use this one' });
    fireEvent.press(buttons[2]);
    expect(onUseThisOne).toHaveBeenCalledWith(2);
  });

  it('renders nothing when not visible', () => {
    renderScreen({ visible: false });
    expect(screen.queryByText('Swap dinner')).toBeNull();
  });
});
