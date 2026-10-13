import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PrimaryIconButton } from '@/shared/components/PrimaryIconButton';
import { colors } from '@/shared/theme/tokens';

// Issue #52 — the design's primary buttons are solid #17191D (ink), 63 uses; the only blue
// button in the whole design is one not-yet-built circle on first open. `PrimaryIconButton` is
// unused anywhere in the app today, so its blue-gradient default was never actually rendered —
// fixing its default to solid ink removes the one remaining blue-primary-button source in the
// shared component library.
describe('foundation: PrimaryIconButton', () => {
  it('fills solid ink, not the retired blue gradient', () => {
    render(
      <PrimaryIconButton icon={<Text>i</Text>} onPress={() => {}} accessibilityLabel="Continue" />,
    );
    const gradient = screen.UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual([colors.ink, colors.ink]);
  });

  it('uses the design neutral shadow instead of the retired blue shadow', () => {
    render(
      <PrimaryIconButton icon={<Text>i</Text>} onPress={() => {}} accessibilityLabel="Continue" />,
    );

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      shadowColor: 'rgba(8,24,44,0.3)',
    });
  });
});
