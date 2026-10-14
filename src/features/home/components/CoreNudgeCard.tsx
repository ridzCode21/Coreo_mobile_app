import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';

type CoreNudgeCardProps = {
  text: string;
};

export function CoreNudgeCard({ text }: CoreNudgeCardProps) {
  return (
    <GlassCard variant="light" radius={radii.ml} padded={false} style={styles.card}>
      <View style={styles.content}>
        <Svg
          width={componentSizes.homeNudgeIcon}
          height={componentSizes.homeNudgeIcon}
          viewBox="0 0 24 24"
          fill="none"
          style={styles.icon}
        >
          <Path
            d="M4 9c2.5-2 5.5-2 8 0s5.5 2 8 0M4 13.5c2.5-2 5.5-2 8 0s5.5 2 8 0M4 18c2.5-2 5.5-2 8 0s5.5 2 8 0"
            stroke={colors.ink80}
            strokeWidth={componentSizes.homeNudgeIconStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.copy}>
          <View style={styles.header}>
            <Text style={styles.title}>Your core</Text>
            <Text style={styles.time}>Now</Text>
          </View>
          <Text style={styles.body}>{text}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.sheetTitleGap,
  },
  icon: {
    marginTop: spacing.sheetSubtitleGap,
  },
  copy: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    ...textStyle('nudgeTitle'),
    color: colors.ink,
  },
  time: {
    ...textStyle('nudgeTime'),
    color: colors.ink45,
  },
  body: {
    ...textStyle('bodySm'),
    color: colors.ink,
    marginTop: spacing.dockItemGap,
  },
});
