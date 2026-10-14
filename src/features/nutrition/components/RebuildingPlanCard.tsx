import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { regenerateReasonLabel } from '@/features/nutrition/lib/regenerateReasons';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { MealPlanStatus, RegenerationReason } from '@/shared/types/mealPlan';

export type BuildingStatus = Extract<MealPlanStatus, 'pending' | 'generating' | 'validating'>;
type StepState = 'done' | 'active' | 'pending';

const STEP_LABELS = [
  'Hearing you out',
  'Swapping out the heavy cooking',
  'Double-checking it adds up',
] as const;

const ACTIVE_STEP: Record<BuildingStatus, number> = {
  pending: 0,
  generating: 1,
  validating: 2,
};

type RebuildingPlanCardProps = {
  status: BuildingStatus;
  reason: RegenerationReason | null;
};

export function RebuildingPlanCard({ status, reason }: RebuildingPlanCardProps) {
  const activeStep = ACTIVE_STEP[status];

  return (
    <GlassCard variant="sheet" radius={radii.xxl} style={styles.card}>
      <View style={styles.grabber} />
      <Text style={styles.title}>Rebuilding your plan…</Text>
      {reason ? (
        <Text style={styles.subtitle}>
          Fitting it to &quot;{regenerateReasonLabel(reason)}.&quot;
        </Text>
      ) : null}
      <GlassCard variant="night" radius={radii.xl} style={styles.stepsCard}>
        <View style={styles.steps}>
          {STEP_LABELS.map((label, index) => {
            const state: StepState =
              index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending';
            return <ProgressStep key={label} label={label} index={index} state={state} />;
          })}
        </View>
      </GlassCard>
      <Text style={styles.footer}>This won&apos;t count against today until it&apos;s ready.</Text>
    </GlassCard>
  );
}

function ProgressStep({ label, index, state }: { label: string; index: number; state: StepState }) {
  const testID = state === 'pending' ? undefined : `rebuild-step-${index}-${state}`;

  return (
    <View testID={testID} style={[styles.step, state === 'pending' && styles.pendingStep]}>
      <View style={[styles.indicator, styles[`${state}Indicator`]]}>
        {state === 'done' ? (
          <Svg width={spacing.ms} height={spacing.ms} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17l-5-5"
              stroke={colors.ink}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  grabber: {
    alignSelf: 'center',
    width: componentSizes.sheetGrabberWidth,
    height: componentSizes.sheetGrabberHeight,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.ink, 0.18),
  },
  title: { ...textStyle('cardTitle'), color: colors.ink, marginTop: spacing.sheetTitleGap },
  subtitle: {
    ...textStyle('sheetSubtitle'),
    color: colors.ink55,
    marginTop: spacing.sheetSubtitleGap,
  },
  stepsCard: { marginTop: spacing.lg },
  steps: { gap: spacing.ml },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pendingStep: { opacity: 0.4 },
  indicator: {
    width: componentSizes.rebuildingStepIndicator,
    height: componentSizes.rebuildingStepIndicator,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIndicator: { backgroundColor: colors.white },
  activeIndicator: {
    borderWidth: componentSizes.rebuildingStepBorderWidth,
    borderColor: withAlpha(colors.white, 0.85),
    backgroundColor: withAlpha(colors.white, 0.15),
  },
  pendingIndicator: {
    borderWidth: componentSizes.rebuildingStepBorderWidth,
    borderColor: withAlpha(colors.white, 0.5),
  },
  stepLabel: { ...textStyle('portionEstimate'), color: colors.onNight },
  footer: {
    ...textStyle('legal'),
    color: colors.ink45,
    textAlign: 'center',
    marginTop: spacing.ml,
  },
});
