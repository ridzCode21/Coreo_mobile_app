import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useWellnessProfileQuery } from '@/features/wellness/api/wellnessProfileApi';
import { PillarComingSoonScreen } from '@/features/home';
import { Screen } from '@/shared/components/Screen';
import { colors, textStyle } from '@/shared/theme/tokens';

const INTERVIEW_ROUTE = '/wellness-interview' as Href;

export default function WellnessHomeScreen() {
  const router = useRouter();
  const profileQuery = useWellnessProfileQuery();

  useEffect(() => {
    if (profileQuery.data && !profileQuery.data.wellness_interview_complete) {
      router.replace(INTERVIEW_ROUTE);
    }
  }, [profileQuery.data, router]);

  if (profileQuery.isLoading || (!profileQuery.data && !profileQuery.isError)) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading wellness profile" />
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

  if (!profileQuery.data?.wellness_interview_complete) return null;

  return (
    <PillarComingSoonScreen
      pillar="Wellness"
      title="Wellness logging is next."
      body="Water is already part of the daily summary. Sleep, HRV, and steps stay read-only until the backend supports manual updates."
    />
  );
}

const styles = StyleSheet.create({
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  error: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
});
