import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
} from '@expo-google-fonts/poppins';

import { queryClient } from '@/shared/api/queryClient';
import { useSessionStore } from '@/features/auth';
import { useAppFlagsStore } from '@/shared/stores/appFlagsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_200ExtraLight,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
  });

  const status = useSessionStore((state) => state.status);
  const bootstrap = useSessionStore((state) => state.bootstrap);
  const flagsHydrated = useAppFlagsStore((state) => state.hydrated);
  const hydrateFlags = useAppFlagsStore((state) => state.hydrate);

  useEffect(() => {
    bootstrap();
    hydrateFlags();
  }, [bootstrap, hydrateFlags]);

  // Fonts + session + flags all resolved → the OS splash hands off to our in-app animated splash
  // (src/app/(public)/splash.tsx), which is the true first screen the user sees.
  const ready = fontsLoaded && status !== 'checking' && flagsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const isSignedIn = status === 'signedIn';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(public)" />
            <Stack.Protected guard={isSignedIn}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
