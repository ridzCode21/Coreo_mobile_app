import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { useSourcesQuery, DEVICE_SOURCES } from '@/features/home';
import { sourceLabels } from '@/features/profile/lib/profileCopy';
import { BackButton } from '@/shared/components/BackButton';
import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, radii, spacing, typography } from '@/shared/theme/tokens';

export default function ManageSourcesScreen() {
  const router = useRouter();
  const query = useSourcesQuery();
  const sources = query.data ?? [];

  let content: ReactNode;
  if (query.isError) {
    content = <Text style={styles.status}>Unable to load connected sources.</Text>;
  } else if (query.isLoading) {
    content = <ActivityIndicator color={colors.ink45} />;
  } else {
    content = (
      <View style={styles.rows}>
        {DEVICE_SOURCES.map((source) => {
          const item = sources.find((candidate) => candidate.source === source);
          return (
            <GlassCard key={source} variant="usualNote" radius={radii.md} padded={false}>
              <View style={styles.row}>
                <Text style={styles.source}>{sourceLabels[source]}</Text>
                <Text testID={`source-status-${source}`} style={styles.status}>
                  {item?.connected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
            </GlassCard>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Manage sources</Text>
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
  rows: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: componentSizes.profileKnowledgeMinHeight,
    paddingHorizontal: spacing.fieldPadX,
  },
  source: { ...typography.mealReviewRowTitle, color: colors.ink },
  status: { ...typography.usualRowSubtitle, color: colors.ink55 },
});
