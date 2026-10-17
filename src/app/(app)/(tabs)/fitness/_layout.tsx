import { Stack } from 'expo-router';

export default function FitnessTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="week" />
    </Stack>
  );
}
