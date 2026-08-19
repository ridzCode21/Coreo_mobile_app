import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors } from '@/shared/theme/tokens';
import { useSessionStore } from '@/features/auth';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';
import { useOrientationLock } from '@/shared/hooks/useOrientationLock';
import { AnimatedSplash } from '@/features/splash/components/AnimatedSplash';
import { resolveLaunchDestination } from '@/features/splash/lib/resolveLaunchDestination';
import { firstUnansweredFlowStep, flowStepRoute } from '@/features/onboarding/lib/steps';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';

/**
 * Always the first screen the user sees on cold start (mounted outside the auth gate — see
 * src/app/_layout.tsx). Plays the branded intro, then replaces itself with the correct
 * destination for the current session/first-run state. See docs/implementation-plan.md §5.
 *
 * Also resolves onboarding-v2-flow-plan.md §3's resume rule: waits for both the animation *and*
 * the persisted onboarding draft to finish loading before deciding, so a signed-out user with an
 * in-progress interview lands straight back where they left off instead of at first-open.
 */
export default function SplashScreen() {
  const router = useRouter();
  const isSignedIn = useSessionStore((state) => state.status === 'signedIn');
  const hasSeenFirstOpen = useAppFlagsStore((state) => state.hasSeenFirstOpen);
  const hasHydratedDraft = useOnboardingStore((state) => state.hasHydrated);
  const lastCompletedStep = useOnboardingStore((state) => state.lastCompletedStep);
  const draft = useOnboardingStore((state) => state.draft);
  const [animationDone, setAnimationDone] = useState(false);

  // A short, single-decision, full-bleed moment — locking portrait is acceptable here per
  // docs/design-system.md §11.3 (unlike Home/chat, which must support rotation).
  useOrientationLock('portrait');

  const handleFinished = useCallback(() => setAnimationDone(true), []);

  useEffect(() => {
    if (!animationDone || !hasHydratedDraft) return;
    const hasOnboardingProgress = lastCompletedStep !== null;
    const resumeRoute = hasOnboardingProgress
      ? flowStepRoute(firstUnansweredFlowStep(lastCompletedStep, draft))
      : '/(public)/first-open';
    router.replace(
      resolveLaunchDestination({
        isSignedIn,
        hasSeenFirstOpen,
        hasOnboardingProgress,
        resumeRoute,
      }),
    );
    // `draft`/`hasSeenFirstOpen` intentionally excluded — this should fire exactly once, driven
    // by the animation + hydration gates, not re-run on every draft field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDone, hasHydratedDraft, isSignedIn, lastCompletedStep, router]);

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
