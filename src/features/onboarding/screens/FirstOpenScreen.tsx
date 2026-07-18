import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

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
      <View
        style={[
          styles.content,
          // Safe-area insets are additive to the screen-padding tokens, not a replacement for
          // them — docs/design-system.md §3.
          {
            paddingTop: insets.top + spacing.screenPadTop,
            paddingBottom: insets.bottom + spacing.screenPadBottom,
          },
        ]}
      >
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
