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

type TodayScoreCardProps = {
  now: Date;
  score?: number;
};

export function TodayScoreCard({ now, score }: TodayScoreCardProps) {
  return (
    <GlassCard variant="night" radius={radii.xl} padded={false} style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label}>Today</Text>
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
        <View testID="home-today-wave" style={styles.wave}>
          <WaveChart
            progress={dayProgress(now)}
            height={componentSizes.homeTodayWaveHeight}
            color={colors.white}
            areaFill
            glowDot
          />
        </View>
        <View style={styles.axis}>
          <Text style={styles.axisLabel}>Morning</Text>
          <Text style={styles.axisLabel}>Now</Text>
          <Text style={styles.axisLabel}>Evening</Text>
        </View>
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
