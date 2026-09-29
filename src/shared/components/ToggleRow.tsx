import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';

export type ToggleRowSelectionMode = 'check' | 'radio';

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** `check` (default) for multi-select rows (Pillars, Sources); `radio` for single-select
   * question cards (diet-interview single-choice screens) — same chassis, different mark. */
  selectionMode?: ToggleRowSelectionMode;
  radius?: number;
  minHeight?: number;
  /** Title font size — design source uses 16px on Pillars (7a·4) rows and 14px on the more
   * compact Sources (7a·5) rows, neither of which matches the `cardValue` (22px) token this
   * component used to hardcode. No named typography token covers either exact value, so it's a
   * plain override here rather than a new global token. */
  titleFontSize?: number;
  style?: ViewStyle;
};

/**
 * Full-width selectable row (title + optional subtitle, trailing selection mark) — not in the
 * original docs/design-system.md §7 inventory but reused across onboarding (Pillars 7a·4, Sources
 * 7a·5, diet-interview single/multi question cards), so promoted to shared per architecture.md's
 * "no per-screen reimplementation" rule. See design-system.md changelog (v1.2/v1.4) for the
 * radius/height/sheen/typography refinement passes against the design source.
 */
export function ToggleRow({
  title,
  subtitle,
  selected,
  onPress,
  selectionMode = 'check',
  radius = radii.xl,
  minHeight = 70,
  titleFontSize = 16,
  style,
}: ToggleRowProps) {
  return (
    <View style={selected ? styles.selectedGlow : undefined}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.wrap, { borderRadius: radius }, selected && styles.selectedShadow, style]}
      >
        <View
          style={[
            styles.clip,
            {
              borderRadius: radius,
              minHeight,
              borderColor: selected ? SELECTED_BORDER : UNSELECTED_BORDER,
            },
          ]}
        >
          {/* Real frosted-glass backing (same technique as `GlassCard`) — without it this chassis
           * is just a translucent gradient directly alpha-blended over whatever screen background
           * sits behind it, which reads as a flat tinted rectangle rather than glass, especially on
           * Android where there's no OS-level backdrop blur to fall back on. See GlassCard's
           * identical comment: Android's `dimezisBlurView*` methods need a `blurTarget` that isn't
           * wired up app-wide, so without one the unconfigured fallback rendered as a narrower,
           * hard-edged box rather than filling the row — skip BlurView on Android entirely and
           * rely on the gradient alone until blurTarget is wired up for real Android blur. */}
          {Platform.OS !== 'android' ? (
            <BlurView intensity={selected ? 50 : 35} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <LinearGradient
            colors={selected ? SELECTED_GRADIENT : UNSELECTED_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Approximates the material law's `inset 0 1px 0 rgba(255,255,255,.65)` top highlight —
           * same technique as GlassCard, since this chassis doesn't route through GlassCard itself
           * (it needs its own selected/unselected gradient, not GlassCard's fixed light/night pair). */}
          <LinearGradient
            colors={[selected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[
              styles.topHighlight,
              { borderTopLeftRadius: radius, borderTopRightRadius: radius },
            ]}
          />
          <View style={styles.row}>
            <View style={styles.textCol}>
              <Text
                style={[
                  selected ? styles.titleSelected : styles.titleUnselected,
                  // Both states get an explicit, identical `lineHeight` here — Poppins-Medium
                  // (selected) and Poppins-Light (unselected/`cardValue`) are different font files
                  // with different baked-in vertical metrics, so leaving line-height to each
                  // font's own default (the original bug) made the row's text — and therefore the
                  // whole card, since height tracks content — visibly grow/shrink on tap. Pinning
                  // the same value for both keeps the card's footprint fixed across selection.
                  { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.3) },
                ]}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={selected ? styles.subtitleSelected : styles.subtitleUnselected}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {selected ? (
              selectionMode === 'radio' ? (
                <View style={styles.radioOuterSelected}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.check}>
                  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M4 12l5 5 11-11"
                      stroke={colors.white}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              )
            ) : selectionMode === 'radio' ? (
              <View style={styles.radioOuter} />
            ) : (
              <View style={styles.emptyCircle} />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const SELECTED_GRADIENT = ['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.6)'] as const;
const UNSELECTED_GRADIENT = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.16)'] as const;
const SELECTED_BORDER = 'rgba(255,255,255,0.9)';
const UNSELECTED_BORDER = 'rgba(255,255,255,0.55)';

const styles = StyleSheet.create({
  /** The design's selected row has *two* box-shadows — a dark drop shadow (`selectedShadow`
   * below) and a soft white halo (`0 0 26px rgba(255,255,255,.7)`). RN can only cast one shadow
   * per view, so the halo is a second, outer wrapping view with its own white glow — iOS only;
   * Android shadows are always flat gray-black (design-system.md §4 RN notes), so there's no
   * colored-glow equivalent to add there. */
  selectedGlow: Platform.select({
    ios: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 18,
    },
    default: {},
  }),
  wrap: Platform.select({
    ios: {
      shadowColor: 'rgba(18,42,70,0.14)',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 20,
    },
    default: { elevation: 2 },
  }),
  selectedShadow: Platform.select({
    ios: {
      shadowColor: 'rgba(18,42,70,0.2)',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 1,
      shadowRadius: 28,
    },
    default: { elevation: 5 },
  }),
  clip: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  textCol: {
    flex: 1,
    paddingVertical: spacing.md,
    gap: 3,
  },
  titleSelected: {
    // Design source: selected row title is weight 500 (Pillars/Sources both bold their selected
    // label), not the 300 this used to hardcode.
    fontFamily: fontFamily.poppins500,
    color: colors.ink,
  },
  titleUnselected: {
    ...textStyle('cardValue'),
    // Design source uses rgba(23,25,29,.8) for unselected row text — noticeably higher contrast
    // than the `ink60` (.62) token, which read as too faint against the design.
    color: 'rgba(23,25,29,0.8)',
  },
  subtitleSelected: {
    ...textStyle('bodySm'),
    color: colors.label,
  },
  subtitleUnselected: {
    ...textStyle('bodySm'),
    color: colors.ink40,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(23,25,29,0.3)',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(23,25,29,0.3)',
  },
  radioOuterSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.ink,
  },
});
