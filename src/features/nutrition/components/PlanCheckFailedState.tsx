import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type { QuotaExceededError } from '@/shared/types/mealPlan';

type PlanCheckFailedStateProps = {
  pending: boolean;
  quotaError: QuotaExceededError | null;
  onRebuild: () => void;
  onAdjust: () => void;
};

export function PlanCheckFailedState({
  pending,
  quotaError,
  onRebuild,
  onAdjust,
}: PlanCheckFailedStateProps) {
  return (
    <View style={styles.root}>
      <View style={styles.message}>
        <Svg
          width={componentSizes.planFailedIcon}
          height={componentSizes.planFailedIcon}
          viewBox="0 0 24 24"
          fill="none"
          style={styles.icon}
        >
          <Circle
            cx={12}
            cy={12}
            r={9}
            stroke={colors.ink}
            strokeWidth={componentSizes.planFailedStrokeWidth}
          />
          <Path
            d="M9 10h.01M15 10h.01M9 16c1-1.2 5-1.2 6 0"
            stroke={colors.ink}
            strokeWidth={componentSizes.planFailedStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View>
          <Text style={styles.title}>This one didn&apos;t quite balance.</Text>
          <Text style={styles.subtitle}>
            A couple of things clashed with your goals. Nothing logged, nothing lost.
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {quotaError ? <QuotaBanner error={quotaError} /> : null}
        <View style={styles.primaryGlow}>
          <Pressable
            onPress={onRebuild}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel="Rebuild the plan"
            style={styles.primary}
          >
            {pending ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.primaryText}>Rebuild the plan</Text>
            )}
          </Pressable>
        </View>
        <Pressable
          onPress={onAdjust}
          accessibilityRole="button"
          accessibilityLabel="Or adjust it myself"
          style={styles.adjustAction}
        >
          <Text style={styles.adjustText}>Or adjust it myself</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  message: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  icon: { opacity: 0.4 },
  title: { ...textStyle('planFailedTitle'), color: colors.ink, textAlign: 'center' },
  subtitle: {
    ...textStyle('body'),
    color: colors.ink60,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: componentSizes.planFailedMessageMaxWidth,
  },
  actions: { gap: spacing.ml },
  primaryGlow: {
    borderRadius: radii.xl,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: componentSizes.planFailedGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  primary: {
    minHeight: componentSizes.planFailedActionHeight,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.overlayInk,
    shadowOffset: { width: 0, height: spacing.md },
    shadowOpacity: 0.2,
    shadowRadius: componentSizes.planActionShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  primaryText: { ...textStyle('button'), color: colors.ink },
  adjustAction: {
    minHeight: componentSizes.minimumTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    ...textStyle('caption'),
    color: colors.ink50,
    textDecorationLine: 'underline',
  },
});
