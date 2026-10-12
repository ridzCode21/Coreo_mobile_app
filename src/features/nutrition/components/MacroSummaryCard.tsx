import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import {
  computeRemaining,
  macroFillRatio,
  type MacroTargets,
} from '@/features/nutrition/lib/macros';
import type { TargetQuality } from '@/features/onboarding';
import type { MacroSummary } from '@/shared/types/food';

type MacroSummaryCardProps = {
  targets: MacroTargets;
  consumed: MacroSummary;
  quality: TargetQuality;
};

/** Muted variants of `onNight` for labels on the dark hero card (opacity ramp of the same token,
 * matching the precedent in `VoiceInputBar`). Bars use white-glass fills — the night analog of
 * `SliderRow`'s documented ink track/fill (design-system §6/§9). */
const ON_NIGHT_MUTED = 'rgba(239,244,249,0.62)';
const ON_NIGHT_FAINT = 'rgba(239,244,249,0.45)';
const BAR_TRACK = 'rgba(255,255,255,0.16)';
const BAR_FILL = 'rgba(255,255,255,0.6)';

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

const QUALITY_LABEL: Record<TargetQuality, string> = {
  unavailable: 'Unavailable',
  starter: 'Starter',
  estimated: 'Estimated',
  confirmed: 'Confirmed',
};

/**
 * The Diet home "Left today" hero — the one night-glass card per screen (design-system §4). Shows
 * remaining calories as an oversized weight-200 number (numbers are the hero, §2) plus three thin
 * macro progress bars. Over-budget shows the number neutrally (can be negative) — never red, per
 * the brand's "nothing turns red here" voice (§10). Bars, never wave charts (§6.1).
 */
export function MacroSummaryCard({ targets, consumed, quality }: MacroSummaryCardProps) {
  const remaining = computeRemaining(targets, consumed);

  return (
    <GlassCard variant="night" radius={radii.xl}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Left today</Text>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>{QUALITY_LABEL[quality]}</Text>
        </View>
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
                <View style={[styles.fill, { width: `${macroFillRatio(eaten, target) * 100}%` }]} />
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
    alignItems: 'center',
  },
  eyebrow: {
    ...textStyle('label'),
    color: ON_NIGHT_FAINT,
  },
  qualityBadge: {
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  qualityText: {
    ...textStyle('micro'),
    color: ON_NIGHT_MUTED,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  heroNumber: {
    ...textStyle('display'),
    color: colors.onNight,
    flexShrink: 1,
  },
  heroUnit: {
    ...textStyle('bodyLg'),
    color: ON_NIGHT_MUTED,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  barBlock: {
    flex: 1,
    gap: spacing.sm,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    ...textStyle('caption'),
    color: ON_NIGHT_MUTED,
  },
  barValue: {
    ...textStyle('caption'),
    color: colors.onNight,
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: BAR_TRACK,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: BAR_FILL,
  },
});
