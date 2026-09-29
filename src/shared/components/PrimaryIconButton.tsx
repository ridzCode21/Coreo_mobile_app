import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/shared/theme/tokens';

type PrimaryIconButtonProps = {
  /** Icon content, expected to render in white (e.g. an SVG icon or emoji-free glyph). */
  icon: ReactNode;
  onPress: () => void;
  /** 44–64px per docs/design-system.md §7. */
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel: string;
};

/**
 * The one primary action per screen (docs/design-system.md §1/§7 — `coreBlue` is reserved for
 * this single door on a screen, never reused for decoration). Circular, gradient-filled, white
 * icon. Don't render more than one of these on a screen at once.
 */
export function PrimaryIconButton({
  icon,
  onPress,
  size = 56,
  disabled = false,
  style,
  accessibilityLabel,
}: PrimaryIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.shadowWrap, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <LinearGradient
        colors={[colors.coreBlue, colors.coreBlueDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, { borderRadius: size / 2, opacity: disabled ? 0.5 : 1 }]}
      >
        {icon}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: Platform.select({
    ios: {
      shadowColor: 'rgba(22,57,94,0.4)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
    },
    default: { elevation: 6 },
  }),
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
