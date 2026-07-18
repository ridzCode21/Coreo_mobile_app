import type { Href } from 'expo-router';

/**
 * Where the splash screen sends the user once its minimum on-screen time + animation have both
 * finished — see docs/implementation-plan.md §5 acceptance criteria. Pulled out of the screen
 * component so the decision itself is a plain, easily-reasoned-about function.
 */
export function resolveLaunchDestination(params: {
  isSignedIn: boolean;
  hasSeenFirstOpen: boolean;
}): Href {
  if (params.isSignedIn) return '/(app)';
  if (!params.hasSeenFirstOpen) return '/(public)/first-open';
  // Returning, signed-out user — no standalone login screen in the 57-screen export (F1 in
  // implementation-plan.md §1); assumed destination until that's decided at Phase 2.
  return '/(auth)/login';
}
