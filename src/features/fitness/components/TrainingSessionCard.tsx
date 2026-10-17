import { StyleSheet, Text, View } from 'react-native';

import { formatSetLine } from '@/features/fitness/lib/trainingWeekFormat';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import type { TrainingWeekSession } from '@/shared/types/trainingWeek';

type Props = { session: TrainingWeekSession };

export function TrainingSessionCard({ session }: Props) {
  return (
    <GlassCard
      variant="dietHero"
      radius={radii.xl}
      contentPaddingVertical={spacing.sheetTitleGap}
      contentPaddingHorizontal={spacing.xl}
    >
      <View style={styles.metaRow}>
        <Text style={styles.eyebrow}>Today&apos;s session</Text>
        <Text style={styles.meta}>
          {session.duration_min} min · {session.gear}
        </Text>
      </View>
      {/* The screen headline already announces this API-sourced name; hide the duplicate from AT. */}
      <Text
        style={styles.name}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {session.name}
      </Text>
      <View style={styles.exercises}>
        {session.exercises.map((exercise) => (
          <View key={exercise.key} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseSets}>{formatSetLine(exercise)}</Text>
          </View>
        ))}
      </View>
      {session.progression_note ? (
        <Text style={styles.progression}>{session.progression_note}</Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  eyebrow: { ...textStyle('weekReviewDaysEyebrow'), color: colors.fitnessOnNight50 },
  meta: { ...textStyle('cardHint'), color: colors.fitnessOnNight50 },
  name: { ...textStyle('weekReviewTargetValue'), color: colors.onNight, marginTop: spacing.ms },
  exercises: { gap: spacing.sm, marginTop: spacing.md },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  exerciseName: {
    ...textStyle('fitnessExerciseRow'),
    color: colors.fitnessOnNight75,
    flex: 1,
  },
  exerciseSets: { ...textStyle('fitnessExerciseRow'), color: colors.fitnessOnNight50 },
  progression: { ...textStyle('legal'), color: colors.usualOnNightMuted, marginTop: spacing.md },
});
