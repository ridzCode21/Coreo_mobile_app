import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useFitnessProfileQuery } from '@/features/fitness/api/fitnessProfileApi';
import { PillarComingSoonScreen } from '@/features/home';
import { Screen } from '@/shared/components/Screen';
import { colors, textStyle } from '@/shared/theme/tokens';

const INTERVIEW_ROUTE = '/fitness-interview' as Href;

export default function FitnessHomeScreen() {
  const router = useRouter();
  const profileQuery = useFitnessProfileQuery();

  useEffect(() => {
    if (profileQuery.data && !profileQuery.data.fitness_interview_complete) {
      router.replace(INTERVIEW_ROUTE);
    }
  }, [profileQuery.data, router]);

  if (profileQuery.isLoading || (!profileQuery.data && !profileQuery.isError)) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading fitness profile" />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <Text style={styles.error}>Something went wrong. Try again.</Text>
      </Screen>
    );
  }

  if (!profileQuery.data.fitness_interview_complete) return null;

  return (
    <PillarComingSoonScreen
      pillar="Fitness"
      title="Workout logging is next."
      body="This tab is in the shell now so Coreo has somewhere real to connect training data once it's built."
    />
  );
}

const styles = StyleSheet.create({
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  error: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
});
