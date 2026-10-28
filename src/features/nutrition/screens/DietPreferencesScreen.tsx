import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useDietProfileQuery } from '@/features/onboarding';
import { DietPersonalizationCard } from '@/features/nutrition/components/DietPersonalizationCard';
import { BackButton } from '@/shared/components/BackButton';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, spacing, typography } from '@/shared/theme/tokens';

export default function DietPreferencesScreen() {
  const router = useRouter();
  const query = useDietProfileQuery();

  let content: ReactNode;
  if (query.isError) {
    content = <Text style={styles.status}>Unable to load your diet profile.</Text>;
  } else if (query.isLoading || !query.data) {
    content = <ActivityIndicator color={colors.ink45} />;
  } else {
    content = <DietPersonalizationCard profile={query.data} />;
  }

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Diet preferences</Text>
          <View style={styles.headerSpacer} />
        </View>
        {content}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  title: { ...typography.cardTitle, color: colors.ink },
  status: { ...typography.usualRowSubtitle, color: colors.ink55 },
});
