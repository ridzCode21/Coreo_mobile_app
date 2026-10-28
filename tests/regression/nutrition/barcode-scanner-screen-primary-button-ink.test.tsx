/**
 * Issue #126 — `BarcodeScannerScreen`'s manual-code-entry "Look it up" primary action painted a
 * legacy coreBlue fill instead of the design's solid ink (#17191D)
 * (docs/design-system.md §1 law 4: "Primary buttons are solid ink"). `BarcodeScannerView` is
 * stubbed here (it owns the only `expo-camera` import) so this test can reach manual mode without
 * mocking the camera permission flow.
 */

import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import BarcodeScannerScreen from '@/features/nutrition/screens/BarcodeScannerScreen';
import { colors } from '@/shared/theme/tokens';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useBarcodeLookup: () => ({
    isSuccess: false,
    isError: false,
    isFetching: false,
    data: undefined,
    error: undefined,
  }),
}));

jest.mock('@/features/nutrition/components/BarcodeScannerView', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BarcodeScannerView: ({ onEnterManually }: { onEnterManually: () => void }) => (
      <Pressable onPress={onEnterManually} accessibilityRole="button">
        <Text>Enter manually (stub)</Text>
      </Pressable>
    ),
  };
});

describe('nutrition: BarcodeScannerScreen manual-entry primary button is solid ink (issue #126)', () => {
  it('fills "Look it up" with solid ink, not the retired coreBlue fill', () => {
    render(<BarcodeScannerScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Enter manually (stub)' }));

    const button = screen.getByRole('button', { name: 'Look it up' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ backgroundColor: colors.ink });
  });
});
