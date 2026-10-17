import { Stack } from 'expo-router';

import { useRightNowCheck } from '@/features/wellness';

export default function AppLayout() {
  useRightNowCheck();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fitness-interview" />
      <Stack.Screen name="wellness-interview" />
      <Stack.Screen name="right-now" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
