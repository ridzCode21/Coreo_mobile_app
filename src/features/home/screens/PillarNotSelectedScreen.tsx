import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { SkyBackground } from '@/shared/components/SkyBackground';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

const COREO_ROUTE = '/core' as Href;

type PillarNotSelectedScreenProps = {
  pillar: 'Fitness' | 'Wellness';
};

export default function PillarNotSelectedScreen({ pillar }: PillarNotSelectedScreenProps) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SkyBackground style={StyleSheet.absoluteFill} />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>{pillar}</Text>
        <Text style={styles.title}>{`${pillar} isn't part of your plan yet.`}</Text>

        <GlassCard variant="light" radius={radii.xl}>
          <Text style={styles.cardLabel}>Not chosen at signup</Text>
          <Text style={styles.body}>
            {`You picked other pillars when you signed up, so I never asked ${pillar} questions. There's nothing to show here yet.`}
          </Text>
        </GlassCard>

        <Pressable
          onPress={() => router.push(COREO_ROUTE)}
          accessibilityRole="button"
          accessibilityLabel="Back to Coreo"
          style={styles.backPill}
        >
          <Text style={styles.backText}>Back to Coreo</Text>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingBottom: 112,
  },
  eyebrow: {
    ...textStyle('label'),
    color: colors.ink45,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyle('pageTitle'),
    color: colors.ink,
    marginBottom: spacing.xxl,
  },
  cardLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  body: {
    ...textStyle('body'),
    color: colors.ink62,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backPill: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.62),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.66),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  backText: {
    ...textStyle('body'),
    color: colors.ink,
  },
});
