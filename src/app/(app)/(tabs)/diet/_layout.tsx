import { Stack } from 'expo-router';

export default function DietTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}
