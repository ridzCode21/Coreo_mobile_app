import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { WaveMark } from '@/shared/components/WaveMark';
import { GlassCard } from '@/shared/components/GlassCard';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import { useOrientationLock } from '@/shared/hooks/useOrientationLock';

/**
 * First-open (20a/24a) — the landing moment for a brand-new user, straight after the splash.
 * Portrait-locked intentionally (design-system.md §11.3 allows this for a short, single-decision
 * screen). Real onboarding questions are Phase 3 — "Begin" just proves the routing/first-run
 * flag for now (docs/implementation-plan.md §5).
 */
export default function FirstOpenScreen() {
  const router = useRouter();
  const markFirstOpenSeen = useAppFlagsStore((state) => state.markFirstOpenSeen);

  useOrientationLock('portrait');

  const handleBegin = useCallback(async () => {
    await markFirstOpenSeen();
    router.replace('/(auth)/login');
  }, [markFirstOpenSeen, router]);

  return (
    <LinearGradient
      colors={[colors.day, colors.air, colors.sky]}
      locations={[0, 0.48, 1]}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.fill}
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <WaveMark size={64} showWordmark color={colors.ink} wordmarkColor={colors.ink} />
          <Text style={styles.tagline}>A health app with a core.</Text>
        </View>

        <Pressable onPress={handleBegin} accessibilityRole="button" accessibilityLabel="Begin">
          <GlassCard radius={radii.pill} style={styles.ctaCard}>
            <Text style={styles.ctaText}>Begin</Text>
          </GlassCard>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadX,
    paddingTop: spacing.screenPadTop,
    paddingBottom: spacing.screenPadBottom,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  tagline: {
    ...textStyle('body'),
    color: colors.ink60,
    textAlign: 'center',
  },
  ctaCard: {
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: {
    ...textStyle('body'),
    color: colors.ink,
    textAlign: 'center',
  },
});
