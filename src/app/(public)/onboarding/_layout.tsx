import { Stack } from 'expo-router';

/**
 * Minimal v3 pre-signup onboarding — see docs/onboarding-v3-minimal-drip-plan.md and
 * `features/onboarding/lib/steps.ts` for the actual step order. Diet personalization continues
 * after signup inside the Diet tab.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="about-you" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="pillars" />
      <Stack.Screen name="save" />
    </Stack>
  );
}
