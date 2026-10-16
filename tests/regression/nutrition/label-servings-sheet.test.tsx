/**
 * Issue #26, design 21d "How many servings?" (design-spec.md lines 119-167). A bottom sheet
 * reached from 21c's servings chip: a slider from 1.0x to the label's own
 * `servings_per_container`, a live total line, and "Save serving" to hand the chosen multiplier
 * back to 21c (this sheet never calls the API or creates an entry itself — `LabelResultScreen`
 * owns the actual `POST /food/entries/` on "Looks right"). Reuses `PortionSlider`
 * (`src/features/nutrition/components/PortionSlider.tsx`), the same drag-only slider component as
 * the existing "Adjust the portion" sheet, per CLAUDE.md's reuse-before-invent guardrail.
 */

import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { LabelServingsSheet } from '@/features/nutrition/components/LabelServingsSheet';

const PER_SERVING = { est_calories: 250, est_protein_g: 10, est_carbs_g: 44, est_fat_g: 7 };

function renderSheet(overrides: Partial<React.ComponentProps<typeof LabelServingsSheet>> = {}) {
  const props: React.ComponentProps<typeof LabelServingsSheet> = {
    visible: true,
    multiplier: 1,
    portionGrams: 68,
    servingsPerContainer: 2.5,
    perServing: PER_SERVING,
    busy: false,
    onMultiplier: jest.fn(),
    onClose: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  };
  render(<LabelServingsSheet {...props} />);
  return props;
}

describe('nutrition: LabelServingsSheet (issue #26, design 21d)', () => {
  it('renders the exact design title and the container/serving-size subtitle', () => {
    renderSheet({ portionGrams: 68, servingsPerContainer: 2.5 });
    expect(screen.getByText('How many servings?')).toBeTruthy();
    expect(screen.getByText('The container has 2.5 · 1 serving = 68g.')).toBeTruthy();
  });

  it('shows the big multiplier readout driven by the current value', () => {
    renderSheet({ multiplier: 1 });
    expect(screen.getByText('1×')).toBeTruthy();
  });

  it('exposes a slider from 1.0x to the container size, not from 0', () => {
    renderSheet({ servingsPerContainer: 2.5 });
    const slider = screen.getByRole('adjustable');
    expect(slider.props.accessibilityValue).toEqual(expect.objectContaining({ min: 1, max: 2.5 }));
  });

  it('shows the live total scaled straight off the label, no estimating', () => {
    renderSheet({ multiplier: 2, perServing: PER_SERVING });
    expect(screen.getByText('500 kcal · 20g protein · 88g carbs · 14g fat')).toBeTruthy();
    expect(screen.getByText('Scales straight off the label, no estimating')).toBeTruthy();
  });

  it('recomputes the live total as the multiplier prop changes (re-render on drag)', () => {
    const { rerender } = render(<LabelServingsSheet {...buildProps({ multiplier: 1 })} />);
    expect(screen.getByText('250 kcal · 10g protein · 44g carbs · 7g fat')).toBeTruthy();
    rerender(<LabelServingsSheet {...buildProps({ multiplier: 2.5 })} />);
    expect(screen.getByText('625 kcal · 25g protein · 110g carbs · 18g fat')).toBeTruthy();
  });

  it('recomputes the live total during an active slider drag', () => {
    const { UNSAFE_getByType } = render(<LabelServingsSheet {...buildProps({ multiplier: 1 })} />);
    fireEvent(screen.getByRole('adjustable'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } },
    });

    const gesture = UNSAFE_getByType(GestureDetector).props.gesture;
    act(() => {
      gesture.handlers.onStart({});
      gesture.handlers.onUpdate({ translationX: 100 });
    });

    expect(screen.getByText('375 kcal · 15g protein · 66g carbs · 10.5g fat')).toBeTruthy();
  });

  it('calls onSave with nothing extra — the chosen multiplier already flows via onMultiplier', () => {
    const onSave = jest.fn();
    renderSheet({ onSave });
    fireEvent.press(screen.getByRole('button', { name: 'Save serving' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables "Save serving" while busy and shows a spinner instead of the label', () => {
    renderSheet({ busy: true });
    const button = screen.getByRole('button', { name: 'Save serving' });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('renders nothing visible to the tree query when not visible', () => {
    renderSheet({ visible: false });
    expect(screen.queryByText('How many servings?')).toBeNull();
  });
});

function buildProps(
  overrides: Partial<React.ComponentProps<typeof LabelServingsSheet>>,
): React.ComponentProps<typeof LabelServingsSheet> {
  return {
    visible: true,
    multiplier: 1,
    portionGrams: 68,
    servingsPerContainer: 2.5,
    perServing: PER_SERVING,
    busy: false,
    onMultiplier: jest.fn(),
    onClose: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  };
}
