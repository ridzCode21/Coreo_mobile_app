import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors } from '@/shared/theme/tokens';
import { useSessionStore } from '@/features/auth';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import { useOrientationLock } from '@/shared/hooks/useOrientationLock';
import { AnimatedSplash } from '@/features/splash/components/AnimatedSplash';
import { resolveLaunchDestination } from '@/features/splash/lib/resolveLaunchDestination';

/**
 * Always the first screen the user sees on cold start (mounted outside the auth gate — see
 * src/app/_layout.tsx). Plays the branded intro, then replaces itself with the correct
 * destination for the current session/first-run state. See docs/implementation-plan.md §5.
 */
export default function SplashScreen() {
  const router = useRouter();
  const isSignedIn = useSessionStore((state) => state.status === 'signedIn');
  const hasSeenFirstOpen = useAppFlagsStore((state) => state.hasSeenFirstOpen);

  // A short, single-decision, full-bleed moment — locking portrait is acceptable here per
  // docs/design-system.md §11.3 (unlike Home/chat, which must support rotation).
  useOrientationLock('portrait');

  const handleFinished = useCallback(() => {
    router.replace(resolveLaunchDestination({ isSignedIn, hasSeenFirstOpen }));
  }, [router, isSignedIn, hasSeenFirstOpen]);

  return (
    // Approximates the design source's 168deg sky-ramp gradient (day → air → sky) — see
    // docs/implementation-plan.md §5 "Design source". expo-linear-gradient takes a direction
    // vector, not a CSS angle; this is a close visual match, not a pixel-exact conversion.
    <LinearGradient
      colors={[colors.day, colors.air, colors.sky]}
      locations={[0, 0.48, 1]}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.fill}
    >
      <AnimatedSplash onFinished={handleFinished} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
