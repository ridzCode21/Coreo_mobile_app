import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SelectableChip } from '@/shared/components/SelectableChip';

describe('foundation: SelectableChip', () => {
  it('renders its label and reports the selected state to accessibility', () => {
    render(<SelectableChip label="Vegetarian" selected onPress={() => {}} />);
    expect(screen.getByText('Vegetarian')).toBeTruthy();
    expect(screen.getByRole('button', { selected: true })).toBeTruthy();
  });

  it('preserves the selected chip shadow from the design', () => {
    render(<SelectableChip label="Vegetarian" selected onPress={() => {}} />);

    const chip = screen.getByRole('button', { selected: true });
    expect(StyleSheet.flatten(chip.props.style).shadowColor).toBe('rgba(18,42,70,0.18)');
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<SelectableChip label="Vegan" selected={false} onPress={onPress} />);
    fireEvent.press(screen.getByText('Vegan'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
