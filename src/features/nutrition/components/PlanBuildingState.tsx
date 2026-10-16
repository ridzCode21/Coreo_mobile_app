import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { buildStepIndex, type BuildingStatus } from '@/features/nutrition/lib/planBuildSteps';
import { GlassCard } from '@/shared/components/GlassCard';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';

const STEP_LABELS = [
  'Reading your usuals',
  'Balancing your macros',
  'Double-checking it adds up',
] as const;

type StepState = 'done' | 'active' | 'pending';

export function PlanBuildingState({ status }: { status: BuildingStatus }) {
  const activeStep = buildStepIndex(status);

  return (
    <View style={styles.root}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Building today&apos;s plate…</Text>
        <Text style={styles.subtitle}>Give me a few seconds. I check the math twice.</Text>
      </View>
      <View style={styles.spacer} />
      <GlassCard
        variant="dietHero"
        radius={radii.xl}
        contentPaddingVertical={spacing.xl}
        contentPaddingHorizontal={spacing.planBuildingCardPaddingX}
      >
        <View style={styles.steps}>
          {STEP_LABELS.map((label, index) => {
            const state: StepState =
              index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending';
            return <BuildStep key={label} label={label} index={index} state={state} />;
          })}
        </View>
      </GlassCard>
      <Text style={styles.footer}>This won&apos;t count against today until it&apos;s ready.</Text>
    </View>
  );
}

function BuildStep({ label, index, state }: { label: string; index: number; state: StepState }) {
  return (
    <View
      testID={state === 'pending' ? undefined : `plan-build-step-${index}-${state}`}
      style={[styles.step, state === 'pending' && styles.pendingStep]}
    >
      <View style={[styles.indicator, styles[`${state}Indicator`]]}>
        {state === 'done' ? (
          <Svg width={spacing.md} height={spacing.md} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17l-5-5"
              stroke={colors.ink}
              strokeWidth={componentSizes.planDoneStrokeWidth}
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
  root: { flexGrow: 1 },
  titleBlock: { marginTop: spacing.planTitleTop },
  title: { ...textStyle('sheetTitle'), color: colors.ink },
  subtitle: {
    ...textStyle('small'),
    color: colors.ink55,
    marginTop: spacing.planSubtitleTop,
  },
  spacer: { flexGrow: 1, minHeight: spacing.xxxl },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pendingStep: { opacity: 0.4 },
  indicator: {
    width: componentSizes.planBuildingStepIndicator,
    height: componentSizes.planBuildingStepIndicator,
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
