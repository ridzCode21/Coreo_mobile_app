import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import {
  computeRemaining,
  macroFillRatio,
  type MacroTargets,
} from '@/features/nutrition/lib/macros';
import type { MacroSummary } from '@/shared/types/food';

type MacroSummaryCardProps = {
  targets: MacroTargets;
  consumed: MacroSummary;
};

/** Muted variants of `onNight` for labels on the dark hero card (opacity ramp of the same token,
 * matching the precedent in `VoiceInputBar`). Bars use white-glass fills — the night analog of
 * `SliderRow`'s documented ink track/fill (design-system §6/§9). */
const ON_NIGHT_LABEL = withAlpha(colors.fog, 0.5);
const ON_NIGHT_UNIT = withAlpha(colors.fog, 0.55);
const ON_NIGHT_MACRO = withAlpha(colors.fog, 0.65);
const BAR_TRACK = withAlpha(colors.white, 0.16);

function formatThousands(value: number): string {
  // Locale-independent grouping (RN's Intl is inconsistent across platforms/Android builds).
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return (
    sign +
    Math.abs(rounded)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  );
}

type MacroKey = 'protein_g' | 'carbs_g' | 'fat_g';
const MACROS: { key: MacroKey; label: string }[] = [
  { key: 'protein_g', label: 'Protein' },
  { key: 'carbs_g', label: 'Carbs' },
  { key: 'fat_g', label: 'Fat' },
];

/**
 * The Diet home "Left today" hero — the one night-glass card per screen (design-system §4). Shows
 * remaining calories as an oversized weight-200 number (numbers are the hero, §2) plus three thin
 * macro progress bars. Over-budget shows the number neutrally (can be negative) — never red, per
 * the brand's "nothing turns red here" voice (§10). Bars, never wave charts (§6.1).
 */
export function MacroSummaryCard({ targets, consumed }: MacroSummaryCardProps) {
  const remaining = computeRemaining(targets, consumed);

  return (
    <GlassCard
      variant="dietHero"
      radius={radii.xl}
      contentPaddingVertical={spacing.dietHeroCardPaddingY}
      contentPaddingHorizontal={spacing.dietCardPaddingX}
    >
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Left today</Text>
        <Text style={styles.cardHint}>Adjusts as I learn you</Text>
      </View>

      <View style={styles.heroRow}>
        <Text style={styles.heroNumber} allowFontScaling numberOfLines={1} adjustsFontSizeToFit>
          {formatThousands(remaining.calories)}
        </Text>
        <Text style={styles.heroUnit}>kcal</Text>
      </View>

      <View style={styles.bars}>
        {MACROS.map(({ key, label }) => {
          const target = targets[key];
          const eaten = consumed[key];
          return (
            <View key={key} style={styles.barBlock}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barValue}>{Math.round(eaten)}g</Text>
              </View>
              <View style={styles.track}>
                <View
                  testID={`macro-fill-${key}`}
                  style={[styles.fill, { width: `${macroFillRatio(eaten, target) * 100}%` }]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  eyebrow: {
    ...textStyle('label'),
    color: ON_NIGHT_LABEL,
  },
  cardHint: {
    ...textStyle('cardHint'),
    color: ON_NIGHT_LABEL,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.dietHeroNumberTop,
  },
  heroNumber: {
    ...textStyle('kcalHero'),
    color: colors.onNight,
    flexShrink: 1,
  },
  heroUnit: {
    ...textStyle('kcalUnit'),
    color: ON_NIGHT_UNIT,
    marginLeft: spacing.dietHeroUnitGap,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.ms,
    marginTop: spacing.dietMacroTop,
  },
  barBlock: {
    flex: 1,
    gap: spacing.dietMacroTrackGap,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    ...textStyle('macroRow'),
    color: ON_NIGHT_MACRO,
  },
  barValue: {
    ...textStyle('macroRow'),
    color: ON_NIGHT_MACRO,
  },
  track: {
    height: componentSizes.dietMacroTrackHeight,
    borderRadius: radii.pill,
    backgroundColor: BAR_TRACK,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: colors.white,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: componentSizes.dietMacroGlowRadius,
      },
      default: {
        shadowColor: colors.white,
        elevation: componentSizes.dietElevation,
      },
    }),
  } as ViewStyle,
});
