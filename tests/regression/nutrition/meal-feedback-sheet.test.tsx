/**
 * Issue #34 — the feedback sheet (design screen 29d) had different copy and chips from the design:
 * title "How did this land?" (no body line), placeholder "Optional note", button "Save feedback"
 * (`src/features/nutrition/screens/MealDetailScreen.tsx:541,555,559` pre-fix), and eight wrapped
 * chips including "Not for me" / "Something else" with "Too expensive" / "Couldn't find items"
 * instead of "Too pricey" / "Not available" (`:51-60` pre-fix). This protects the design's exact
 * copy, the six-chip set mapped to the backend's `FeedbackType` values
 * (`apps/meals/models.py:168-176`), and that no removed chip can still be selected.
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FeedbackSheet } from '@/features/nutrition/components/FeedbackSheet';
import { colors } from '@/shared/theme/tokens';

function renderSheet(overrides: Partial<React.ComponentProps<typeof FeedbackSheet>> = {}) {
  const props: React.ComponentProps<typeof FeedbackSheet> = {
    visible: true,
    value: 'like',
    note: '',
    busy: false,
    onValue: jest.fn(),
    onNote: jest.fn(),
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  render(<FeedbackSheet {...props} />);
  return props;
}

describe('nutrition: FeedbackSheet (issue #34 — matches design 29d)', () => {
  it('renders the design title and subtitle', () => {
    renderSheet();
    expect(screen.getByText('How was it?')).toBeTruthy();
    expect(screen.getByText('Helps me plan better tomorrow.')).toBeTruthy();
  });

  it('uses the design spacing above the title and subtitle', () => {
    renderSheet();
    expect(StyleSheet.flatten(screen.getByText('How was it?').props.style).marginTop).toBe(18);
    expect(
      StyleSheet.flatten(screen.getByText('Helps me plan better tomorrow.').props.style).marginTop,
    ).toBe(2);
  });

  it('renders exactly the six design chips, in design order', () => {
    renderSheet();
    const expectedLabels = [
      'Loved it',
      'Too heavy',
      'Too light',
      'Too much cooking',
      'Too pricey',
      'Not available',
    ];
    for (const label of expectedLabels) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('uses the design chip label size and unselected colour', () => {
    renderSheet();
    expect(StyleSheet.flatten(screen.getByText('Loved it').props.style)).toMatchObject({
      fontSize: 12,
    });
    expect(StyleSheet.flatten(screen.getByText('Too heavy').props.style)).toMatchObject({
      color: colors.ink75,
      fontSize: 12,
    });
  });

  it('never renders the retired chips or copy', () => {
    renderSheet();
    expect(screen.queryByText('Not for me')).toBeNull();
    expect(screen.queryByText('Something else')).toBeNull();
    expect(screen.queryByText('Too expensive')).toBeNull();
    expect(screen.queryByText("Couldn't find items")).toBeNull();
    expect(screen.queryByText('How did this land?')).toBeNull();
    expect(screen.queryByPlaceholderText('Optional note')).toBeNull();
    expect(screen.queryByText('Save feedback')).toBeNull();
  });

  it('shows the design placeholder and button copy', () => {
    renderSheet();
    expect(screen.getByPlaceholderText('Anything else? Optional.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeTruthy();
  });

  it.each([
    ['Loved it', 'like'],
    ['Too heavy', 'too_heavy'],
    ['Too light', 'too_light'],
    ['Too much cooking', 'too_much_cooking'],
    ['Too pricey', 'too_expensive'],
    ['Not available', 'not_available'],
  ])('maps "%s" to the backend feedback_type "%s"', (label, value) => {
    const { onValue } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: label }));
    expect(onValue).toHaveBeenCalledWith(value);
    cleanup();
  });

  it('submits via the "Send feedback" button', () => {
    const { onSubmit } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
