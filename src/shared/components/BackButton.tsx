import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, componentSizes, glass, radii, spacing } from '@/shared/theme/tokens';

type BackButtonProps = {
  onPress: () => void;
};

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress}>
      <LinearGradient
        colors={glass.afterSnapNav.gradient}
        start={glass.afterSnapNav.start}
        end={glass.afterSnapNav.end}
        style={styles.control}
      >
        <Svg
          width={componentSizes.replaceBackIcon}
          height={componentSizes.replaceBackIcon}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d="M15 18l-6-6 6-6"
            stroke={colors.ink80}
            strokeWidth={componentSizes.planHeaderStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    borderColor: glass.afterSnapNav.border,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    elevation: componentSizes.dietElevation,
    height: componentSizes.dietHeaderControl,
    justifyContent: 'center',
    shadowColor: glass.afterSnapNav.shadowColor,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    width: componentSizes.dietHeaderControl,
  },
});
