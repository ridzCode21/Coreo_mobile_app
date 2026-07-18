import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, textStyle } from '@/shared/theme/tokens';

/** The wave logo path, exact from the design source — see docs/design-system.md §0/§6. */
export const WAVE_PATH = 'M 16 60 C 32 36, 48 36, 60 60 S 92 84, 104 60';
export const WAVE_VIEWBOX = '0 0 120 120';
/** Hand-measured approximation of WAVE_PATH's rendered length — long enough to fully hide the
 * stroke via strokeDasharray for the splash's animated draw-in (see features/splash). */
export const WAVE_PATH_LENGTH = 140;

type WaveMarkProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  style?: ViewStyle;
};

/**
 * The wave mark — the app's logo, reused across headers, empty states, and the app icon (see
 * component inventory, docs/design-system.md §7). Always renders fully drawn; the animated
 * draw-in on the splash screen is feature-local (needs Reanimated-driven strokeDashoffset, which
 * doesn't belong in a shared static primitive) but reuses `WAVE_PATH`/`WAVE_VIEWBOX` from here.
 */
export function WaveMark({
  size = 48,
  color = colors.ink,
  strokeWidth = 4,
  showWordmark = false,
  wordmarkColor = colors.ink,
  style,
}: WaveMarkProps) {
  return (
    <View style={[styles.row, style]}>
      <Svg width={size} height={size} viewBox={WAVE_VIEWBOX}>
        <Path
          d={WAVE_PATH}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      {showWordmark ? (
        <Text style={[textStyle('wordmark'), { color: wordmarkColor }]}>coreo</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
