import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

type Props = { onPress: () => void; disabled?: boolean };

export function StravaConnectButton({ onPress, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityLabel="Connect with Strava"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.label}>Connect with Strava</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.stravaOrange,
    borderRadius: radii.pill,
    height: componentSizes.stravaConnectButtonHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: { ...typography.button, color: colors.white },
});
