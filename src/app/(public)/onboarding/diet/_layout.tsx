import { Stack } from 'expo-router';

/**
 * The whole nutrition interview (`goal` + 12a·1–12a·6 + the added cuisine/activity/budget/health
 * screens) + the calibrating hand-off — onboarding-v2-flow-plan.md §1/§2. Runs entirely
 * pre-signup now: every answer only ever writes to the local `onboardingStore` draft (persisted,
 * see that file), so there's nothing to hydrate from the server here anymore — the draft *is* the
 * source of truth until "Save your core" commits it in one `PUT` after register.
 *
 * Lives under `(public)/onboarding` rather than `(app)` (F6, feature-map.md): `(public)` is never
 * gated by `Stack.Protected` (docs/architecture.md §5), which matters even more now that the
 * whole interview — not just the tail end — runs before an account exists.
 */
export default function OnboardingDietLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[step]" />
      <Stack.Screen name="calibrating" />
    </Stack>
  );
}
