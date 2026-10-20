import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useInsightsQuery } from '@/features/patterns/api/insightsApi';
import { CalibratingDaysCard } from '@/features/patterns/components/CalibratingDaysCard';
import { InsightCard } from '@/features/patterns/components/InsightCard';
import { BackButton } from '@/shared/components/BackButton';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, componentSizes, spacing, textStyle } from '@/shared/theme/tokens';

export default function PatternsScreen() {
  const router = useRouter();
  const query = useInsightsQuery();

  let content: ReactNode;
  let footer: string | null = null;

  if (query.isLoading) {
    content = <ActivityIndicator color={colors.ink45} />;
  } else if (query.isError || !query.data) {
    content = <Text style={styles.status}>Unable to load your patterns.</Text>;
  } else if (query.data.status === 'not_enough_data') {
    content = (
      <>
        <CalibratingDaysCard daysLogged={query.data.days_logged} />
        <Text style={styles.calibratingBody}>
          {
            "Patterns take time to see clearly. Once you've logged consistently for about a month, I'll start pointing out what seems connected."
          }
        </Text>
      </>
    );
    footer = 'Not medical advice — just what I notice in your own numbers.';
  } else if (query.data.status === 'no_insights') {
    content = <Text style={styles.status}>{query.data.message}</Text>;
  } else {
    content = query.data.insights.map((insight) => (
      <InsightCard key={insight.id} insight={insight} />
    ));
    footer = 'Not medical advice — just a pattern I noticed in your own data.';
  }

  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.eyebrow}>Patterns</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.body}>{content}</View>
        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenContent: { flexGrow: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerSpacer: {
    height: componentSizes.dietHeaderControl,
    width: componentSizes.dietHeaderControl,
  },
  eyebrow: { ...textStyle('sourceQuietNavLabel'), color: colors.ink45 },
  body: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sheetTitleGap,
    justifyContent: 'center',
    paddingVertical: spacing.sheetTitleGap,
  },
  calibratingBody: {
    ...textStyle('body'),
    color: colors.ink60,
    maxWidth: componentSizes.patternsBodyMaxWidth,
    textAlign: 'center',
  },
  status: { ...textStyle('body'), color: colors.ink60, textAlign: 'center' },
  footer: { ...textStyle('fine'), color: colors.ink40, textAlign: 'center' },
});
