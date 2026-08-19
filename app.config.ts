import type { ExpoConfig } from 'expo/config';

// Env-aware app config (see docs/architecture.md §6). Real secrets never live here directly —
// only references to process.env, populated locally via .env and in CI/EAS via EAS secrets.
const defaultLiveApiUrl = 'https://vesselled-maxton-ringlike.ngrok-free.dev/api/v1';

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
    // Photo meal-logging (expo-image-picker, nutrition feature). Set here directly rather than via
    // the expo-image-picker config plugin so the app still builds before the package is installed
    // (`npx expo install expo-image-picker`). Calm, first-person copy per design-system.md §10.
    infoPlist: {
      NSCameraUsageDescription: 'Coreo uses your camera to read your meal, so you can log it without typing.',
      NSPhotoLibraryUsageDescription: 'Coreo reads a photo of your meal to estimate its nutrition.',
    },
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
    // Camera for photo meal-logging (see ios.infoPlist note above).
    permissions: ['android.permission.CAMERA'],
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultLiveApiUrl,
    // 'mock' (default) routes every request through the in-app mock router instead of the
    // network — see docs/implementation-plan.md §2. Set to 'live' for the ngrok backend above.
    apiMode: process.env.EXPO_PUBLIC_API_MODE ?? 'mock',
  },
};

export default config;
