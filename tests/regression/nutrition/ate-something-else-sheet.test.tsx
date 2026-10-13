/**
 * Issue #34 — the "ate something else" sheet (design screen 31a) had different copy from the
 * design: body "No problem. Give me a quick estimate..." instead of "No plan needed — I'll still
 * count it.", placeholder "What did you have?" instead of "e.g. leftover pizza, two slices",
 * "~300 kcal"-style chips instead of "~300", and a static "Log it" button with no meal type, no
 * "About how much?" label and no "Carbs and fat default to zero" note
 * (`src/features/nutrition/screens/MealDetailScreen.tsx:586-609` pre-fix). This protects the
 * design's exact copy, chip values, the dynamic meal-type button text and the decorative voice
 * affordance the design shows in the input pill.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { OutsideSheet } from '@/features/nutrition/components/OutsideSheet';
import { colors } from '@/shared/theme/tokens';

function renderSheet(overrides: Partial<React.ComponentProps<typeof OutsideSheet>> = {}) {
  const props: React.ComponentProps<typeof OutsideSheet> = {
    visible: true,
    mealType: 'dinner',
    description: '',
    calories: 500,
    busy: false,
    onDescription: jest.fn(),
    onCalories: jest.fn(),
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
  render(<OutsideSheet {...props} />);
  return props;
}

describe('nutrition: OutsideSheet (issue #34 — matches design 31a)', () => {
  it('renders the design title and subtitle', () => {
    renderSheet();
    expect(screen.getByText('Ate something else?')).toBeTruthy();
    expect(screen.getByText("No plan needed — I'll still count it.")).toBeTruthy();
  });

  it('renders the design placeholder and "about how much?" label', () => {
    renderSheet();
    expect(screen.getByPlaceholderText('e.g. leftover pizza, two slices')).toBeTruthy();
    expect(screen.getByText('About how much?')).toBeTruthy();
  });

  it('renders the three calorie chips with the design\'s exact labels (no "kcal" suffix)', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: '~300' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '~500' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '~700' })).toBeTruthy();
    expect(screen.queryByText('~300 kcal')).toBeNull();
  });

  it('uses the design chip label size and unselected colour', () => {
    renderSheet();
    expect(StyleSheet.flatten(screen.getByText('~500').props.style)).toMatchObject({
      fontSize: 12,
    });
    expect(StyleSheet.flatten(screen.getByText('~300').props.style)).toMatchObject({
      color: colors.ink75,
      fontSize: 12,
    });
  });

  it('selecting a chip reports the matching calorie value', () => {
    const { onCalories } = renderSheet();
    fireEvent.press(screen.getByRole('button', { name: '~300' }));
    expect(onCalories).toHaveBeenCalledWith(300);
    fireEvent.press(screen.getByRole('button', { name: '~700' }));
    expect(onCalories).toHaveBeenCalledWith(700);
  });

  it('renders the zero-default note under the button', () => {
    renderSheet();
    expect(screen.getByText('Carbs and fat default to zero unless you tell me more.')).toBeTruthy();
  });

  it('uses the real meal type in the button copy, for any meal type', () => {
    renderSheet({ mealType: 'dinner' });
    expect(screen.getByRole('button', { name: "Log it — that's dinner" })).toBeTruthy();
  });

  it('updates the button copy when the meal type is different', () => {
    renderSheet({ mealType: 'breakfast' });
    expect(screen.getByRole('button', { name: "Log it — that's breakfast" })).toBeTruthy();
    expect(screen.queryByText("Log it — that's dinner")).toBeNull();
  });

  it('never renders the retired copy', () => {
    renderSheet();
    expect(screen.queryByText(/No problem\. Give me a quick estimate/)).toBeNull();
    expect(screen.queryByPlaceholderText('What did you have?')).toBeNull();
    expect(screen.queryByText('Log it')).toBeNull();
  });

  it('disables submit until a description is entered, matching existing behaviour', () => {
    renderSheet({ description: '' });
    expect(
      screen.getByRole('button', { name: "Log it — that's dinner" }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('shows the decorative voice affordance from the design markup', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: 'Voice input' })).toBeTruthy();
  });

  it('submits through the "Log it" button when a description is present', () => {
    const { onSubmit } = renderSheet({ description: 'Leftover pizza' });
    fireEvent.press(screen.getByRole('button', { name: "Log it — that's dinner" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
