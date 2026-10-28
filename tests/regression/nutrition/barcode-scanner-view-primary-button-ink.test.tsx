/**
 * Issue #126 — `BarcodeScannerView`'s "Allow camera" primary action (shown while camera
 * permission isn't granted) painted a legacy coreBlue fill instead of the design's solid ink
 * (#17191D) (docs/design-system.md §1 law 4: "Primary buttons are solid ink").
 */

import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { BarcodeScannerView } from '@/features/nutrition/components/BarcodeScannerView';
import { colors } from '@/shared/theme/tokens';

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
  CameraView: () => null,
}));

describe('nutrition: BarcodeScannerView permission screen primary button is solid ink (issue #126)', () => {
  it('fills "Allow camera" with solid ink, not the retired coreBlue fill', () => {
    render(
      <BarcodeScannerView
        onScan={jest.fn()}
        onClose={jest.fn()}
        onEnterManually={jest.fn()}
        paused={false}
      />,
    );

    const button = screen.getByRole('button', { name: 'Allow camera' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ backgroundColor: colors.ink });
  });
});
