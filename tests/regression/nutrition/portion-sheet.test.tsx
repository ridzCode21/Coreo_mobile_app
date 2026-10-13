/**
 * Issue #33 — "The portion sheet has four preset buttons, one of them mislabelled ['Double' = 1.5,
 * not actually double], and tells the user the meal was logged when it was only rescaled."
 * (`src/features/nutrition/screens/MealDetailScreen.tsx:47-52,420-436` pre-fix). The design (29c
 * "Adjust the portion / Same meal, more or less of it." + 36a "Adjust the portion / Same meal —
 * half, double, or any amount you like.") replaces the four preset chips with a slider (0.25×–3×)
 * plus a "type your own amount" field and a live macro estimate — 36a is the screen actually
 * implemented (29c's body/range is an earlier iteration of the same sheet; 36a is the one that
 * adds the typed-amount capability the issue asks for, see plan.md Decision log). This protects
 * the sheet's exact copy/order, that the estimate is derived (never invented) from the meal's own
 * macros via `computePortionEstimate`, that a typed amount is wired to the same value the slider
 * controls, and that every preset-button trace (including the old title/body) is gone.
 */

import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { PortionSheet } from '@/features/nutrition/components/PortionSheet';

const BASE_MACROS = { calories_kcal: 500, protein_g: 30, carbs_g: 40, fat_g: 10 };

function renderSheet(overrides: Partial<React.ComponentProps<typeof PortionSheet>> = {}) {
  const props: React.ComponentProps<typeof PortionSheet> = {
    visible: true,
    multiplier: 1.4,
    baseMacros: BASE_MACROS,
    busy: false,
    onMultiplier: jest.fn(),
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  render(<PortionSheet {...props} />);
  return props;
}

describe('nutrition: PortionSheet (issue #33 — matches design 36a)', () => {
  it('renders the design title and subtitle', () => {
    renderSheet();
    expect(screen.getByText('Adjust the portion')).toBeTruthy();
    expect(screen.getByText('Same meal — half, double, or any amount you like.')).toBeTruthy();
  });

  it('shows the big multiplier readout driven by the current value', () => {
    renderSheet({ multiplier: 1.4 });
    expect(screen.getByText('1.4×')).toBeTruthy();
  });

  it('shows the "type your own amount" row with the current value', () => {
    renderSheet({ multiplier: 2.75 });
    expect(screen.getByText('Or type your own amount')).toBeTruthy();
    expect(screen.getByDisplayValue('2.75')).toBeTruthy();
  });

  it('shows a live estimate derived from the meal’s own base macros, not an invented number', () => {
    renderSheet({ multiplier: 1.4, baseMacros: BASE_MACROS });
    // 500*1.4=700, 30*1.4=42, 40*1.4=56, 10*1.4=14 — see portionEstimate.test.ts for the rule.
    expect(
      screen.getByText('About 700 kcal · roughly 42g protein, 56g carbs, 14g fat'),
    ).toBeTruthy();
  });

  it('updates the estimate when the multiplier prop changes', () => {
    const { rerender } = render(
      <PortionSheet
        visible
        multiplier={1}
        baseMacros={BASE_MACROS}
        busy={false}
        onMultiplier={jest.fn()}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(
      screen.getByText('About 500 kcal · roughly 30g protein, 40g carbs, 10g fat'),
    ).toBeTruthy();

    rerender(
      <PortionSheet
        visible
        multiplier={2}
        baseMacros={BASE_MACROS}
        busy={false}
        onMultiplier={jest.fn()}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(
      screen.getByText('About 1000 kcal · roughly 60g protein, 80g carbs, 20g fat'),
    ).toBeTruthy();
  });

  it('updates the typed amount and estimate during an active slider drag', () => {
    const onMultiplier = jest.fn();
    const { UNSAFE_getByType } = render(
      <PortionSheet
        visible
        multiplier={1.4}
        baseMacros={BASE_MACROS}
        busy={false}
        onMultiplier={onMultiplier}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    const slider = screen.getByRole('adjustable');
    fireEvent(slider, 'layout', {
      nativeEvent: { layout: { width: 275, height: 32, x: 0, y: 0 } },
    });

    const gesture = UNSAFE_getByType(GestureDetector).props.gesture;
    act(() => {
      gesture.handlers.onStart({});
      gesture.handlers.onUpdate({ translationX: 60 });
    });

    expect(screen.getByDisplayValue('2')).toBeTruthy();
    expect(
      screen.getByText('About 1000 kcal · roughly 60g protein, 80g carbs, 20g fat'),
    ).toBeTruthy();
    expect(onMultiplier).not.toHaveBeenCalled();

    act(() => gesture.handlers.onEnd());
    expect(onMultiplier).toHaveBeenCalledWith(2);
  });

  it('calls onMultiplier with the parsed number when a custom amount is typed', () => {
    const { onMultiplier } = renderSheet({ multiplier: 1 });
    fireEvent.changeText(screen.getByDisplayValue('1'), '2.75');
    expect(onMultiplier).toHaveBeenCalledWith(2.75);
  });

  it('submits via "Save portion"', () => {
    const { onSubmit } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Save portion' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('disables "Save portion" when the amount is below the backend minimum (0.01)', () => {
    renderSheet({ multiplier: 0 });
    expect(screen.getByRole('button', { name: 'Save portion' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('never renders the retired preset-chip copy', () => {
    renderSheet();
    expect(screen.queryByText('How much did you have?')).toBeNull();
    expect(screen.queryByText('Update the portion and I will log the adjusted meal.')).toBeNull();
    expect(screen.queryByText('Less')).toBeNull();
    expect(screen.queryByText('As planned')).toBeNull();
    expect(screen.queryByText('More')).toBeNull();
    expect(screen.queryByText('Double')).toBeNull();
  });
});
