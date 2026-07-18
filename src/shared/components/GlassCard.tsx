import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { radii } from '@/shared/theme/tokens';

export type GlassCardVariant = 'light' | 'night';

type GlassCardProps = PropsWithChildren<{
  variant?: GlassCardVariant;
  style?: ViewStyle;
  radius?: number;
  /** Set false only for the rare screen that already has its own dark/night hero card visible —
   * design-system.md §4 caps this at one per screen. */
  padded?: boolean;
}>;

/**
 * The "liquid glass on sky" material — see docs/design-system.md §4. This is the single place
 * that owns blur/gradient/border/shadow for glass surfaces; screens should compose with this
 * instead of re-implementing the recipe.
 */
export function GlassCard({
  children,
  variant = 'light',
  style,
  radius = radii.lg,
  padded = true,
}: GlassCardProps) {
  const palette = variant === 'light' ? lightPalette : nightPalette;

  return (
    <View
      style={[styles.shadowWrap, { borderRadius: radius, shadowColor: palette.shadowColor }, style]}
    >
      <View style={[styles.clip, { borderRadius: radius, borderColor: palette.border }]}>
        <BlurView
          intensity={variant === 'light' ? 60 : 90}
          tint={variant === 'light' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={palette.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Approximates the web spec's `inset 0 1px 0 rgba(255,255,255,.65)` top highlight —
         * RN has no inset shadow, so a thin fading gradient stripe stands in for it. */}
        <LinearGradient
          colors={[palette.topHighlight, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topHighlight}
        />
        <View style={padded ? styles.content : undefined}>{children}</View>
      </View>
    </View>
  );
}

const lightPalette = {
  gradient: ['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.2)'] as const,
  border: 'rgba(255,255,255,0.6)',
  shadowColor: 'rgba(18,42,70,0.16)',
  topHighlight: 'rgba(255,255,255,0.65)',
};

const nightPalette = {
  gradient: ['rgba(34,66,102,0.55)', 'rgba(12,28,48,0.68)'] as const,
  border: 'rgba(255,255,255,0.2)',
  shadowColor: 'rgba(8,24,44,0.34)',
  topHighlight: 'rgba(255,255,255,0.22)',
};

const styles = StyleSheet.create({
  shadowWrap: Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 1,
      shadowRadius: 32,
    },
    default: { elevation: 8 },
  }) as ViewStyle,
  clip: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    padding: 20,
  },
});
