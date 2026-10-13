import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MealSheetSkyFrame } from '@/features/nutrition/components/MealSheetSkyFrame';
import { deltaLine, formatCountdown } from '@/features/nutrition/lib/replacePreview';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { ReplacePreviewAlternative } from '@/shared/types/mealPlan';

type ReplaceConfirmSheetProps = {
  visible: boolean;
  mealTypeLabel: string;
  original: { calories_kcal: number; carbs_g: number };
  alternative: ReplacePreviewAlternative;
  expiresAt: number;
  busy: boolean;
  error?: boolean;
  onConfirm: () => void;
  onChooseDifferent: () => void;
  onTryAgain: () => void;
};

export function ReplaceConfirmSheet({
  visible,
  mealTypeLabel,
  original,
  alternative,
  expiresAt,
  busy,
  error = false,
  onConfirm,
  onChooseDifferent,
  onTryAgain,
}: ReplaceConfirmSheetProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, expiresAt]);

  const remaining = Math.max(0, expiresAt - now);
  const expired = remaining <= 0;

  return (
    <MealSheetSkyFrame
      visible={visible}
      title="Confirm the swap"
      subtitle=""
      onClose={onChooseDifferent}
    >
      {expired ? (
        <View style={styles.expired}>
          <Text style={styles.expiredTitle}>This swap has expired.</Text>
          <Text style={styles.expiredBody}>
            Your plan is unchanged. Ask for fresh options when you&apos;re ready.
          </Text>
          <Pressable
            onPress={onTryAgain}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <GlassCard variant="night" radius={radii.ml} style={styles.summary}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>Replacing {mealTypeLabel}</Text>
              <Text style={styles.expiry}>Expires in {formatCountdown(remaining)}</Text>
            </View>
            <Text style={styles.mealName}>{alternative.name}</Text>
            <Text style={styles.delta}>{deltaLine(original, alternative)}</Text>
          </GlassCard>
          {error ? (
            <Text style={styles.errorCopy}>
              That swap didn&apos;t go through. Your plan is unchanged — try again.
            </Text>
          ) : null}
          <Pressable
            onPress={onConfirm}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Confirm swap"
            accessibilityState={{ disabled: busy }}
            style={[styles.primaryButton, busy && styles.disabled]}
          >
            <Text style={styles.primaryText}>Confirm swap</Text>
          </Pressable>
          <Pressable
            onPress={onChooseDifferent}
            accessibilityRole="button"
            accessibilityLabel="Choose a different one"
            style={styles.secondaryLink}
          >
            <Text style={styles.secondaryText}>Choose a different one</Text>
          </Pressable>
        </>
      )}
    </MealSheetSkyFrame>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sheetTitleGap,
    paddingVertical: spacing.lg,
  },
  summaryHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...textStyle('micro'), color: withAlpha(colors.fog, 0.55) },
  expiry: { ...textStyle('micro'), color: withAlpha(colors.white, 0.75), textTransform: 'none' },
  mealName: { ...textStyle('replaceConfirmMeal'), color: colors.onNight, marginTop: spacing.sm },
  delta: {
    ...textStyle('legal'),
    color: withAlpha(colors.fog, 0.6),
    marginTop: spacing.replaceDetailGap,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    height: componentSizes.replaceConfirmActionHeight,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  primaryText: { ...textStyle('buttonSm'), color: colors.white },
  secondaryLink: {
    alignItems: 'center',
    minHeight: componentSizes.sheetVoiceButton,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secondaryText: { ...textStyle('caption'), color: colors.ink50, textDecorationLine: 'underline' },
  disabled: { opacity: 0.46 },
  expired: { marginTop: spacing.lg },
  expiredTitle: { ...textStyle('replaceConfirmMeal'), color: colors.ink },
  expiredBody: { ...textStyle('bodySm'), color: colors.ink60, marginTop: spacing.sm },
  errorCopy: { ...textStyle('bodySm'), color: colors.attention, marginTop: spacing.md },
});
