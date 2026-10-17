import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { glass, radii } from '@/shared/theme/tokens';

export type GlassCardVariant =
  | 'light'
  | 'night'
  | 'dietHero'
  | 'labelRecovery'
  | 'chip'
  | 'chipSelected'
  | 'sheet'
  | 'dock'
  | 'afterSnapSurface'
  | 'usualHighlight'
  | 'usualCard'
  | 'usualNote';

type GlassCardProps = PropsWithChildren<{
  variant?: GlassCardVariant;
  style?: ViewStyle;
  radius?: number;
  blurred?: boolean;
  /** Set false only for the rare screen that already has its own dark/night hero card visible —
   * design-system.md §4 caps this at one per screen. */
  padded?: boolean;
  contentPaddingVertical?: number;
  contentPaddingHorizontal?: number;
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
  radius,
  blurred = true,
  padded = true,
  contentPaddingVertical,
  contentPaddingHorizontal,
}: GlassCardProps) {
  const palette = glass[variant];
  const resolvedRadius = radius ?? (variant === 'sheet' ? radii.xxl : radii.lg);
  const blur = {
    light: { intensity: 60, tint: 'light' },
    night: { intensity: 90, tint: 'dark' },
    dietHero: { intensity: 90, tint: 'dark' },
    labelRecovery: { intensity: 90, tint: 'dark' },
    chip: { intensity: 60, tint: 'light' },
    chipSelected: { intensity: 60, tint: 'light' },
    sheet: { intensity: 90, tint: 'light' },
    dock: { intensity: 90, tint: 'light' },
    afterSnapSurface: { intensity: 60, tint: 'light' },
    usualHighlight: { intensity: 90, tint: 'dark' },
    usualCard: { intensity: 60, tint: 'light' },
    usualNote: { intensity: 60, tint: 'light' },
  } as const;

  return (
    <View
      style={[
        styles.shadowWrap,
        { borderRadius: resolvedRadius, shadowColor: palette.shadowColor },
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius: resolvedRadius, borderColor: palette.border }]}>
        {/* Android has no working blur here: `dimezisBlurView*` methods require a `blurTarget`
         * ref wired up via `BlurTargetView` (unconfigured app-wide right now), so without one
         * expo-blur silently falls back to `'none'` — and that fallback's native view has been
         * observed rendering as a narrower, hard-edged rectangle rather than filling the card,
         * not just "no blur" but visibly broken. Skipping BlurView on Android entirely and
         * relying on the gradient alone is the documented fallback (§4: "a fallback (semi-opaque
         * solid color, no blur) ... if it looks bad") — revisit if/when blurTarget is wired up
         * app-wide for real Android blur. */}
        {blurred && Platform.OS !== 'android' ? (
          <BlurView
            intensity={blur[variant].intensity}
            tint={blur[variant].tint}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient
          colors={palette.gradient}
          start={palette.start}
          end={palette.end}
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
        <View
          testID="glass-card-content"
          style={
            padded
              ? [
                  styles.content,
                  contentPaddingVertical !== undefined && {
                    paddingVertical: contentPaddingVertical,
                  },
                  contentPaddingHorizontal !== undefined && {
                    paddingHorizontal: contentPaddingHorizontal,
                  },
                ]
              : undefined
          }
        >
          {children}
        </View>
      </View>
    </View>
  );
}

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
