import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { WaveChart } from '@/shared/components/WaveChart';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

type CalibratingWaveCardProps = {
  day: number | null;
};

export function CalibratingWaveCard({ day }: CalibratingWaveCardProps) {
  return (
    <GlassCard variant="night" radius={radii.xl} padded={false} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.label}>Calibrating</Text>
        <WaveChart dashedOnly color={colors.onNight} style={styles.wave} />
        <View style={styles.footer}>
          {day === null ? <View /> : <Text style={styles.footerText}>Day {day}</Text>}
          <Text style={styles.footerText}>Real by day 4</Text>
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
  label: {
    ...textStyle('label'),
    color: withAlpha(colors.fog, 0.42),
  },
  wave: {
    marginTop: spacing.sliderCaptionGap,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sheetSubtitleGap,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sheetSubtitleGap,
  },
  footerText: {
    ...textStyle('micro'),
    color: withAlpha(colors.fog, 0.36),
  },
});
