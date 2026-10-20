import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { WaveChart } from '@/shared/components/WaveChart';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

type CalibratingDaysCardProps = {
  daysLogged: number;
};

export function CalibratingDaysCard({ daysLogged }: CalibratingDaysCardProps) {
  return (
    <GlassCard
      variant="patternsCalibratingCard"
      radius={radii.xl}
      padded={false}
      style={styles.card}
    >
      <View style={styles.content}>
        <Text style={styles.label}>Calibrating</Text>
        <WaveChart color={colors.onNight} progress={daysLogged / 30} style={styles.wave} />
        <View style={styles.footer}>
          <Text style={styles.footerText}>{`${daysLogged} of 30 days`}</Text>
          <Text style={styles.footerText}>Real soon</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  content: {
    paddingTop: spacing.sheetTitleGap,
    paddingHorizontal: spacing.planBuildingCardPaddingX,
    paddingBottom: spacing.md,
  },
  label: { ...textStyle('wellnessCardLabel'), color: withAlpha(colors.fog, 0.42) },
  wave: { marginTop: spacing.sliderCaptionGap },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sheetSubtitleGap,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sheetSubtitleGap,
  },
  footerText: { ...textStyle('micro'), color: withAlpha(colors.fog, 0.36) },
});
