import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PortionSheet } from '@/features/nutrition/components/PortionSheet';

describe('nutrition: PortionSheet design alignment (issue #33)', () => {
  it('centers the title and subtitle like design 36a', () => {
    render(
      <PortionSheet
        visible
        multiplier={1.4}
        baseMacros={{ calories_kcal: 500, protein_g: 30, carbs_g: 40, fat_g: 10 }}
        busy={false}
        onMultiplier={jest.fn()}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(screen.getByText('Adjust the portion').props.style).textAlign).toBe(
      'center',
    );
    expect(
      StyleSheet.flatten(
        screen.getByText('Same meal — half, double, or any amount you like.').props.style,
      ).textAlign,
    ).toBe('center');
  });
});
