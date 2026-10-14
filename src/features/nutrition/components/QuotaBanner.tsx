import { StyleSheet, Text } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';
import { resetDistance } from '@/features/nutrition/lib/quotaError';
import type { QuotaExceededError } from '@/shared/types/mealPlan';

type QuotaBannerProps = {
  error: QuotaExceededError;
};

export function QuotaBanner({ error }: QuotaBannerProps) {
  return (
    <GlassCard variant="night" radius={radii.xl} style={styles.card}>
      <Text style={styles.label}>Today&apos;s limit is spent</Text>
      <Text style={styles.body}>
        <Text>{error.message}</Text> More unlocks in {resetDistance(error.quota_resets_at)}.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.md,
  },
  label: {
    ...textStyle('label'),
    color: withAlpha(colors.onNight, 0.55),
  },
  body: {
    ...textStyle('bodyLg'),
    color: colors.onNight,
    marginTop: spacing.sm,
  },
});
