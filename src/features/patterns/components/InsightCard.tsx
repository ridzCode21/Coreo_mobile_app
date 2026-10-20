import { StyleSheet, Text, View } from 'react-native';

import type { Insight } from '@/features/patterns/api/insightsApi';
import { columnLabel } from '@/features/patterns/lib/insightColumns';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

type InsightCardProps = {
  insight: Insight;
};

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{columnLabel(insight.col_x)}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{columnLabel(insight.col_y)}</Text>
        </View>
      </View>
      <GlassCard
        variant="patternsInsightCard"
        radius={radii.dietNextMeal}
        blurred={false}
        padded={false}
      >
        <View style={styles.cardContent}>
          <Text style={styles.label}>A pattern worth watching</Text>
          <Text style={styles.body}>{insight.insight_text}</Text>
          <Text style={styles.caption}>{insight.disclaimer}</Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.ml },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    alignItems: 'center',
    backgroundColor: withAlpha(colors.white, 0.5),
    borderColor: withAlpha(colors.white, 0.65),
    borderRadius: radii.dietWeightChip,
    borderWidth: componentSizes.hairline,
    height: componentSizes.dietWeightChipHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chipText: { ...textStyle('mealDetailChip'), color: colors.ink60 },
  cardContent: {
    paddingTop: spacing.planBuildingCardPaddingX,
    paddingHorizontal: spacing.planBuildingCardPaddingX,
    paddingBottom: spacing.xl,
  },
  label: { ...textStyle('label'), color: withAlpha(colors.fog, 0.5) },
  body: { ...textStyle('patternsInsightBody'), color: colors.onNight, marginTop: spacing.md },
  caption: { ...textStyle('legal'), color: withAlpha(colors.fog, 0.55), marginTop: spacing.ml },
});
