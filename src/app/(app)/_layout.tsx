import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Nutrition confirm/edit (15a) — pushed from the log-a-meal flow (describe/photo/barcode). */}
      <Stack.Screen name="nutrition/confirm" />
      {/* Live barcode scanner (Layer 1.1) — full-screen camera, pushed from the log-a-meal sheet. */}
      <Stack.Screen name="nutrition/scan" />
    </Stack>
  );
}
