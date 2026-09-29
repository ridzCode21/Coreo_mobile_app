import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/shared/components/GlassCard';
import { Screen } from '@/shared/components/Screen';
import { WaveChart } from '@/shared/components/WaveChart';
import { colors, fontFamily, radii, spacing, textStyle } from '@/shared/theme/tokens';

const COREO_ROUTE = '/core' as Href;

type PillarComingSoonScreenProps = {
  pillar: 'Fitness' | 'Wellness';
  title: string;
  body: string;
};

export default function PillarComingSoonScreen({
  pillar,
  title,
  body,
}: PillarComingSoonScreenProps) {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.zenith, colors.day, colors.air]}
        style={StyleSheet.absoluteFill}
      />
      <Screen background="transparent" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>{pillar}</Text>
        <Text style={styles.title}>
          {title} <Text style={styles.titleAccent}>No fake data.</Text>
        </Text>

        <GlassCard variant="light" radius={radii.xl}>
          <Text style={styles.cardLabel}>Phase 6</Text>
          <Text style={styles.body}>{body}</Text>
          <WaveChart progress={0.36} height={58} color={colors.ink} />
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
  titleAccent: {
    fontFamily: fontFamily.poppins500,
  },
  cardLabel: {
    ...textStyle('label'),
    color: colors.ink45,
  },
  body: {
    ...textStyle('body'),
    color: colors.ink60,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backPill: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  backText: {
    ...textStyle('body'),
    color: colors.ink,
  },
});
