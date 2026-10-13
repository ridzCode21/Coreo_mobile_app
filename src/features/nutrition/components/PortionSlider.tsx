import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { formatMultiplier } from '@/features/nutrition/lib/portionEstimate';
import { useDragOnlySlider } from '@/shared/components/SliderRow';
import { colors, componentSizes, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

type PortionSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onLiveChange?: (value: number) => void;
};

export function PortionSlider({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  onLiveChange,
}: PortionSliderProps) {
  const { fillStyle, liveValue, onTrackLayout, pan, thumbStyle } = useDragOnlySlider({
    value,
    min,
    max,
    step,
    onChange,
    onLiveChange,
  });

  return (
    <View>
      <Text style={styles.readout}>{formatMultiplier(liveValue)}×</Text>
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Portion multiplier"
          accessibilityValue={{ min, max, now: liveValue }}
          style={styles.track}
          onLayout={onTrackLayout}
        >
          <View style={styles.trackBackground} />
          <Animated.View style={[styles.trackFill, fillStyle]}>
            <LinearGradient
              colors={[withAlpha(colors.ink, 0.3), colors.ink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.captions}>
        <Text style={styles.caption}>{formatMultiplier(min)}×</Text>
        <Text style={styles.caption}>{formatMultiplier(max)}×</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    ...textStyle('portionReadout'),
    color: colors.ink,
    marginTop: spacing.portionReadoutGap,
    textAlign: 'center',
  },
  track: {
    height: componentSizes.portionSliderThumbSize,
    justifyContent: 'center',
    marginTop: spacing.sheetTitleGap,
  },
  trackBackground: {
    backgroundColor: withAlpha(colors.ink, 0.12),
    borderRadius: componentSizes.portionSliderTrackHeight / 2,
    height: componentSizes.portionSliderTrackHeight,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  trackFill: {
    borderRadius: componentSizes.portionSliderTrackHeight / 2,
    height: componentSizes.portionSliderTrackHeight,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
  },
  thumb: {
    backgroundColor: colors.white,
    borderRadius: componentSizes.portionSliderThumbSize / 2,
    height: componentSizes.portionSliderThumbSize,
    marginLeft: -componentSizes.portionSliderThumbSize / 2,
    position: 'absolute',
    width: componentSizes.portionSliderThumbSize,
    ...Platform.select({
      ios: {
        shadowColor: withAlpha(colors.overlayInk, 0.25),
        shadowOffset: { width: 0, height: spacing.sm },
        shadowOpacity: 1,
        shadowRadius: componentSizes.portionSliderShadowRadius,
      },
      default: { elevation: componentSizes.portionSliderElevation },
    }),
  },
  captions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sliderCaptionGap,
  },
  caption: {
    ...textStyle('micro'),
    color: colors.label,
  },
});
