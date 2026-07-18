import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/shared/components/Screen';
import { GlassCard } from '@/shared/components/GlassCard';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import { useSessionStore } from '@/features/auth';

/**
 * Placeholder home screen — proves providers/theme/routing work end-to-end. The real Home
 * screen (petal cluster nav, wave chart, presence orb — docs/design-system.md §7–8) is separate
 * feature work, planned/built one screen at a time via the product-analysis and
 * feature-planning skills, not part of app scaffolding.
 */
export default function HomeScreen() {
  const signOut = useSessionStore((state) => state.signOut);

  return (
    <Screen>
      <Text style={styles.greeting}>Welcome back</Text>
      <GlassCard variant="night" style={styles.card}>
        <Text style={styles.cardText}>
          App scaffold is wired: routing, theme tokens, GlassCard, and session state all work.
        </Text>
      </GlassCard>
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    ...textStyle('greeting'),
    color: colors.ink,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.xl,
  },
  cardText: {
    ...textStyle('body'),
    color: colors.onNight,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    ...textStyle('bodySm'),
    color: colors.label,
  },
});
