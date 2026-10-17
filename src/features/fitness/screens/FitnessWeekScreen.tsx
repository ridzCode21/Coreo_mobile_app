import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTrainingWeekQuery } from '@/features/fitness/api/trainingWeekApi';
import { FitnessHeader } from '@/features/fitness/components/FitnessHeader';
import { TrainingWeekRow } from '@/features/fitness/components/TrainingWeekRow';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';

export default function FitnessWeekScreen() {
  const router = useRouter();
  const query = useTrainingWeekQuery();
  const trainingWeek = query.data?.training_week;

  if (query.isLoading || (!query.data && !query.isError)) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading training week" />
      </Screen>
    );
  }
  if (query.isError || !trainingWeek) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <Text style={styles.error}>Something went wrong. Try again.</Text>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <SkyBackground variant="sheet" style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <FitnessHeader eyebrow="This week's loop" onBack={() => router.back()} />
        <View style={styles.headline}>
          <Text style={styles.headlineLead}>Your week, </Text>
          <Text style={styles.headlineAccent}>built from what you told me.</Text>
        </View>
        <Text style={styles.summary}>{trainingWeek.summary}</Text>
        <View style={styles.rows}>
          {trainingWeek.sessions.length === 0 ? (
            <Text style={styles.empty}>No sessions are planned for the rest of this week.</Text>
          ) : (
            trainingWeek.sessions.map((session) => (
              <TrainingWeekRow key={`${session.key}:${session.date}`} session={session} />
            ))
          )}
        </View>
        <GlassCard
          variant="usualNote"
          radius={radii.md}
          style={styles.footer}
          blurred={false}
          contentPaddingVertical={spacing.md}
          contentPaddingHorizontal={spacing.sheetTitleGap}
        >
          <Text style={styles.footerText}>
            Same loop for 4 weeks, weights creep up, so you can see yourself get stronger.
          </Text>
        </GlassCard>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  error: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
  headline: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sheetTitleGap },
  headlineLead: { ...textStyle('sheetTitle'), color: colors.ink },
  headlineAccent: { ...textStyle('dietHeadlineAccent'), color: colors.ink },
  summary: { ...textStyle('linkSm'), color: colors.ink55, marginTop: spacing.sliderCaptionGap },
  rows: { gap: spacing.ms, marginTop: spacing.ml },
  empty: { ...textStyle('body'), color: colors.ink62 },
  footer: { marginTop: spacing.md },
  footerText: { ...textStyle('reassuranceText'), color: colors.ink65 },
});
