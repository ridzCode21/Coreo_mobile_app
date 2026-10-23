import { StyleSheet, Text, View } from 'react-native';

import { DotMatrixNumeral } from '@/shared/components/DotMatrixNumeral';
import { GlassCard } from '@/shared/components/GlassCard';
import { WaveChart } from '@/shared/components/WaveChart';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import { dayProgress } from '@/features/home/lib/dayProgress';
import type { OfflineHomeView } from '@/features/home/lib/offlineHome';

type TodayScoreCardProps = {
  now: Date;
  score?: number;
  /** Offline Home (design 25c): the "As of" badge, a wave that stops at the saved time, and the
   * saved-time axis. Omit when connected. */
  offline?: Extract<OfflineHomeView, { offline: true }>;
};

const ONLINE_AXIS = ['Morning', 'Now', 'Evening'] as const;

export function TodayScoreCard({ now, score, offline }: TodayScoreCardProps) {
  const axis = offline ? offline.axisLabels : ONLINE_AXIS;
  const progress = offline ? offline.waveProgress : dayProgress(now);
  return (
    <GlassCard variant="night" radius={radii.xl} padded={false} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>Today</Text>
          {offline?.asOfLabel ? (
            <View style={styles.asOfBadge}>
              <Text style={styles.asOfText}>{offline.asOfLabel}</Text>
            </View>
          ) : null}
          {score === undefined ? null : (
            <View testID="home-today-score">
              <DotMatrixNumeral
                value={score}
                color={colors.white}
                cell={componentSizes.homeScoreDotCell}
                offColor={withAlpha(colors.white, 0.1)}
              />
            </View>
          )}
        </View>
        {progress === null ? null : (
          <View testID="home-today-wave" style={styles.wave}>
            <WaveChart
              progress={progress}
              height={componentSizes.homeTodayWaveHeight}
              color={colors.white}
              areaFill
              glowDot
              pastOnly={offline !== undefined}
            />
          </View>
        )}
        {axis ? (
          <View style={styles.axis}>
            {axis.map((label, index) => (
              <Text key={index} style={styles.axisLabel}>
                {label}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  content: {
    paddingTop: spacing.sheetTitleGap,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.ms,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  label: {
    ...textStyle('label'),
    color: withAlpha(colors.fog, 0.5),
  },
  asOfBadge: {
    height: componentSizes.asOfBadgeHeight,
    paddingHorizontal: spacing.asOfBadgePadX,
    borderRadius: radii.asOfBadge,
    backgroundColor: withAlpha(colors.white, 0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  asOfText: {
    ...textStyle('asOfBadge'),
    color: withAlpha(colors.fog, 0.6),
  },
  wave: {
    marginTop: spacing.sheetSubtitleGap,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sheetSubtitleGap,
    paddingBottom: spacing.sheetSubtitleGap,
  },
  axisLabel: {
    ...textStyle('micro'),
    color: withAlpha(colors.fog, 0.42),
  },
});
