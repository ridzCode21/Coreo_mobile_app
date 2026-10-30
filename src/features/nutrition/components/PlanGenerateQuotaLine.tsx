import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import type { PlanActionQuota } from '@/shared/types/mealPlan';

type PlanGenerateQuotaLineProps = {
  quota?: PlanActionQuota;
};

export function PlanGenerateQuotaLine({ quota }: PlanGenerateQuotaLineProps) {
  if (!quota || quota.remaining <= 0) return null;

  const nextUse = quota.used + 1;
  const remainingAfterNext = Math.max(0, quota.remaining - 1);

  return (
    <View style={styles.root}>
      <Text style={styles.text}>
        Uses {nextUse} of {quota.limit} plans today · {remainingAfterNext} left after this
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.sm },
  text: { ...textStyle('small'), color: colors.ink45, textAlign: 'center' },
});
