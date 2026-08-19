import { Stack } from 'expo-router';

/**
 * The whole interview + save — see docs/onboarding-v2-flow-plan.md and
 * `features/onboarding/lib/steps.ts` for the actual step order. All steps share the same
 * sky-gradient chrome (`OnboardingStepScaffold`), so no per-screen header options are needed here.
 * `sources`/`reading` (wearable connect) are off the required path for MVP (v2 plan D1) — no
 * route lives here for them; `Sources`/`Reading` mockScreens were removed rather than kept dead.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="about-you" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="pillars" />
      <Stack.Screen name="promise" />
      <Stack.Screen name="save" />
      <Stack.Screen name="diet" />
    </Stack>
  );
}
