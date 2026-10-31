import { Stack } from 'expo-router';

import { HealthSyncHost } from '@/features/integrations';
import { CheckInNotificationsHost } from '@/features/notifications';
import { useMealQueueSync } from '@/features/nutrition';
import { useRightNowCheck } from '@/features/wellness';

export default function AppLayout() {
  useRightNowCheck();
  useMealQueueSync();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fitness-interview" />
        <Stack.Screen name="wellness-interview" />
        <Stack.Screen name="right-now" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat-presence" options={{ presentation: 'modal' }} />
        <Stack.Screen name="evening-check-in" options={{ presentation: 'modal' }} />
      </Stack>
      <CheckInNotificationsHost />
      <HealthSyncHost />
    </>
  );
}
