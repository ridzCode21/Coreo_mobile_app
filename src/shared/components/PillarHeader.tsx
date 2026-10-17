import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type Props = {
  eyebrow: string;
  onBack: () => void;
  trailing?: ReactNode;
};

export function PillarHeader({ eyebrow, onBack, trailing }: Props) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={spacing.dockItemGap}
      >
        <LinearGradient
          colors={[withAlpha(colors.white, 0.6), withAlpha(colors.white, 0.25)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backButton}
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
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      {trailing ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: componentSizes.dietHeaderControl,
    height: componentSizes.dietHeaderControl,
    borderRadius: radii.pill,
    borderWidth: componentSizes.hairline,
    borderColor: withAlpha(colors.white, 0.65),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: withAlpha(colors.overlayInk, 0.12),
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  eyebrow: { ...textStyle('afterSnapEyebrow'), color: colors.ink45, textAlign: 'center' },
  spacer: { width: componentSizes.dietHeaderControl, height: componentSizes.dietHeaderControl },
});
