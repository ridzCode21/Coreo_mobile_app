import type { Href } from 'expo-router';

/**
 * Where the splash screen sends the user once its minimum on-screen time + animation have both
 * finished — see docs/implementation-plan.md §5 acceptance criteria. Pulled out of the screen
 * component so the decision itself is a plain, easily-reasoned-about function.
 *
 * F1 (feature-map.md) resolved for now: every signed-out user — first-time *or* returning —
 * lands on first-open, never `(auth)/login`. The 57-screen export has no standalone return-user
 * login screen; its only account entry point is "Save your core", reached via
 * first-open → onboarding. Routing returning signed-out users to the placeholder `login.tsx`
 * was a dead end (nothing there leads back into onboarding), so `hasSeenFirstOpen` no longer
 * affects this decision — it's kept as a param/flag for future analytics or a "welcome back"
 * variant of first-open, not for branching the destination.
 *
 * v3 keeps the resume branch: a signed-out user with a
 * persisted, in-progress interview draft skips first-open entirely and resumes exactly where they
 * left off, rather than restarting. `hasOnboardingProgress`/`resumeRoute` are only meaningful once
 * the onboarding store has finished rehydrating from AsyncStorage — callers must gate on that
 * (`useOnboardingStore`'s `hasHydrated`) before computing them; this function stays a pure,
 * already-resolved-inputs decision either way.
 */
export function resolveLaunchDestination(params: {
  isSignedIn: boolean;
  hasSeenFirstOpen: boolean;
  hasOnboardingProgress: boolean;
  resumeRoute: Href;
}): Href {
  if (params.isSignedIn) return '/(app)';
  if (params.hasOnboardingProgress) return params.resumeRoute;
  return '/(public)/first-open';
}
