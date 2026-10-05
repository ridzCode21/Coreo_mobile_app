import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
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
        {error.message} More unlocks in {resetDistance(error.quota_resets_at)}.
      </Text>
      <View style={styles.chip}>
        <Text style={styles.chipText}>
          {error.tier} · {error.limit}/day
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.md,
  },
  label: {
    ...textStyle('label'),
    color: 'rgba(239,244,249,0.55)',
  },
  body: {
    ...textStyle('bodyLg'),
    color: colors.onNight,
    marginTop: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    ...textStyle('micro'),
    color: 'rgba(239,244,249,0.68)',
  },
});
