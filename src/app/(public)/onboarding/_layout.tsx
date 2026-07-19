import { Stack } from 'expo-router';

/**
 * 7a·1–7a·7 core setup + 8a save — see docs/implementation-plan.md §5. All steps share the same
 * sky-gradient chrome (`OnboardingStepScaffold`), so no per-screen header options are needed here.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="about-you" />
      <Stack.Screen name="pillars" />
      <Stack.Screen name="sources" />
      <Stack.Screen name="reading" />
      <Stack.Screen name="promise" />
      <Stack.Screen name="save" />
    </Stack>
  );
}
