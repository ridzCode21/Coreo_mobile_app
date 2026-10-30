import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { QuotaBanner } from '@/features/nutrition/components/QuotaBanner';
import { PlanGenerateQuotaLine } from '@/features/nutrition/components/PlanGenerateQuotaLine';
import { glass, colors, componentSizes, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type { PlanActionQuota, QuotaExceededError } from '@/shared/types/mealPlan';

type PlanNoPlanStateProps = {
  pending: boolean;
  quotaError: QuotaExceededError | null;
  quota?: PlanActionQuota;
  onGenerate: () => void;
};

export function PlanNoPlanState({ pending, quotaError, quota, onGenerate }: PlanNoPlanStateProps) {
  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Let&apos;s build today&apos;s plate.</Text>
        <Text style={styles.titleAccent}>One tap, and I fit it to you.</Text>
      </View>
      <View style={styles.iconWrap}>
        <Svg
          width={componentSizes.planHeroIcon}
          height={componentSizes.planHeroIcon}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            d="M7 2v9a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2M7 2v20M11 2v7M17 2c-1.5 3-1.5 6 0 8s1.5 5 0 8"
            stroke={colors.ink}
            strokeWidth={componentSizes.planHeroStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View>
        <View style={styles.actionGlow}>
          <Pressable
            onPress={onGenerate}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel="Generate today's plan"
          >
            <LinearGradient
              colors={glass.chipSelected.gradient}
              start={glass.chipSelected.start}
              end={glass.chipSelected.end}
              style={styles.action}
            >
              <Text style={styles.actionText}>Generate today&apos;s plan</Text>
              <View style={styles.plusCircle}>
                {pending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Svg
                    width={componentSizes.dietActionIcon}
                    height={componentSizes.dietActionIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <Path
                      d="M12 5v14M5 12h14"
                      stroke={colors.white}
                      strokeWidth={componentSizes.planHeaderStrokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        </View>
        <PlanGenerateQuotaLine quota={quota} />
        {quotaError ? <QuotaBanner error={quotaError} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  titleBlock: { marginTop: spacing.planTitleTop },
  title: { ...textStyle('sheetTitle'), color: colors.ink },
  titleAccent: { ...textStyle('dietHeadlineAccent'), color: colors.ink },
  iconWrap: {
    flexGrow: 1,
    minHeight: componentSizes.planHeroIcon,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.28,
    paddingVertical: spacing.xxxl,
  },
  actionGlow: {
    borderRadius: radii.dietLogPill,
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: componentSizes.planPrimaryGlowRadius,
    elevation: componentSizes.dietElevation,
  },
  action: {
    minHeight: componentSizes.planPrimaryActionHeight,
    borderRadius: radii.dietLogPill,
    borderWidth: componentSizes.hairline,
    borderColor: glass.chipSelected.border,
    paddingLeft: spacing.dietActionPaddingLeft,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: glass.chipSelected.shadowColor,
    shadowOffset: { width: 0, height: spacing.lg },
    shadowOpacity: 1,
    shadowRadius: componentSizes.planPrimaryShadowRadius,
    elevation: componentSizes.dietElevation,
  },
  actionText: { ...textStyle('buttonSm'), color: colors.ink },
  plusCircle: {
    width: componentSizes.dietLogPlus,
    height: componentSizes.dietLogPlus,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.nightShadow,
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 1,
    shadowRadius: componentSizes.dietCircleShadowRadius,
    elevation: componentSizes.dietElevation,
  },
});
