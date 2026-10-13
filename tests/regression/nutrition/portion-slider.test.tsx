/**
 * Issue #33 — the portion sheet (design 29c/36a) needs a slider with a big centered multiplier
 * readout ("1.4×", font-size 44/weight 200 per the design markup) and uppercase min/max captions
 * below the track ("0.25×" / "3×"), not the generic `SliderRow` layout (which renders a label +
 * value header and lives inside its own GlassCard — design-system.md's documented shape for
 * onboarding questions, not this sheet). `PortionSlider` is a new, dedicated component so this
 * sheet can match 29c/36a exactly while reusing `SliderRow`'s proven drag-only gesture technique
 * (`src/shared/components/SliderRow.tsx:36-49` — built once via `useMemo`, UI-thread shared values
 * while dragging, `onChange` only on release) to avoid reintroducing the crash that technique
 * fixed. This test only exercises the *controlled* value→readout contract (render with a given
 * `value` and check what's on screen) — real two-finger drag physics aren't simulated here, same
 * as the rest of this suite (no existing test drives `SliderRow`'s gesture either); verify the
 * actual drag feel on-device per the issue's "How to verify" step.
 */

import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PortionSlider } from '@/features/nutrition/components/PortionSlider';
import { textStyle } from '@/shared/theme/tokens';

describe('nutrition: PortionSlider (issue #33 — design 29c/36a slider)', () => {
  it('renders the current value as a big "×" readout', () => {
    render(<PortionSlider value={1.4} min={0.25} max={3} onChange={jest.fn()} />);
    expect(screen.getByText('1.4×')).toBeTruthy();
  });

  it('uses the design’s big readout style (44px / weight 200 / -1 tracking)', () => {
    render(<PortionSlider value={1.4} min={0.25} max={3} onChange={jest.fn()} />);
    const flattened = StyleSheet.flatten(screen.getByText('1.4×').props.style);
    const expected = textStyle('portionReadout');
    expect(flattened.fontSize).toBe(expected.fontSize);
    expect(flattened.fontFamily).toBe(expected.fontFamily);
    expect(flattened.letterSpacing).toBe(expected.letterSpacing);
  });

  it('shows the min and max as captions below the track', () => {
    render(<PortionSlider value={1.4} min={0.25} max={3} onChange={jest.fn()} />);
    expect(screen.getByText('0.25×')).toBeTruthy();
    expect(screen.getByText('3×')).toBeTruthy();
  });

  it('exposes an accessible adjustable control with the current/min/max values', () => {
    render(<PortionSlider value={1.4} min={0.25} max={3} onChange={jest.fn()} />);
    const slider = screen.getByRole('adjustable');
    expect(slider.props.accessibilityValue).toEqual(
      expect.objectContaining({ min: 0.25, max: 3, now: 1.4 }),
    );
  });

  it('updates the readout when the controlled value prop changes (e.g. after a drag ends)', () => {
    const { rerender } = render(
      <PortionSlider value={1.4} min={0.25} max={3} onChange={jest.fn()} />,
    );
    expect(screen.getByText('1.4×')).toBeTruthy();

    rerender(<PortionSlider value={2.75} min={0.25} max={3} onChange={jest.fn()} />);
    expect(screen.getByText('2.75×')).toBeTruthy();
    expect(screen.queryByText('1.4×')).toBeNull();
  });
});
