import { Stack } from 'expo-router';

/**
 * Pre-auth, non-gated screens (splash, first-open) — always mounted regardless of session state,
 * unlike `(app)`/`(auth)` which are behind `Stack.Protected` guards in the root layout. See
 * docs/architecture.md §5.
 */
export default function PublicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="first-open" />
    </Stack>
  );
}
