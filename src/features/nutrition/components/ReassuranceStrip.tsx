import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

export function ReassuranceStrip() {
  return (
    <LinearGradient
      colors={[withAlpha(colors.white, 0.44), withAlpha(colors.white, 0.1)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.strip}
    >
      <Text style={styles.copy}>
        Went over yesterday? Nothing turns red here. I adjust, we move on.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.45),
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.dietReassurancePaddingX,
  },
  copy: {
    ...textStyle('reassuranceText'),
    color: colors.ink65,
  },
});
