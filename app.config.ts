import type { ExpoConfig } from 'expo/config';

// Env-aware app config (see docs/architecture.md §6). Real secrets never live here directly —
// only references to process.env, populated locally via .env and in CI/EAS via EAS secrets.
const config: ExpoConfig = {
  name: 'Coreo',
  slug: 'coreo',
  version: '1.0.0',
  // Orientation is decided per-screen, not locked app-wide — see docs/design-system.md §11.3.
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'coreo',
  userInterfaceStyle: 'automatic',
  // No newArchEnabled flag: as of Expo SDK 57 / React Native 0.86, the New Architecture is the
  // only supported architecture — there's nothing to opt into.
  ios: {
    bundleIdentifier: 'com.coreo.app',
    supportsTablet: true,
  },
  android: {
    package: 'com.coreo.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#D3E6F8',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.coreo.dev',
  },
};

export default config;
