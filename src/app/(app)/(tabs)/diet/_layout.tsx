import { Stack } from 'expo-router';

export default function DietTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="meal/[id]" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="add-food" />
      <Stack.Screen name="food-search" />
      <Stack.Screen name="my-foods" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="photo-result" />
      <Stack.Screen name="receipt" />
      <Stack.Screen name="label-result" />
      <Stack.Screen name="label-unreadable" />
      <Stack.Screen name="week-review" />
    </Stack>
  );
}
