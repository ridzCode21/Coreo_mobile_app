import type { ExpoConfig } from 'expo/config';

// Env-aware app config (see docs/architecture.md §6). Real secrets never live here directly —
// only references to process.env, populated locally via .env and in CI/EAS via EAS secrets.
const defaultLiveApiUrl = 'https://vesselled-maxton-ringlike.ngrok-free.dev/api/v1';

// Google sign-in (issue #13). The owner fills the real values in .env / EAS secrets; see .env.example.
// The iOS URL scheme is the REVERSED iOS client ID. The plugin refuses to build without the
// 'com.googleusercontent.apps.' prefix, so the fallback is a clearly fake value with that prefix.
const googleIosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ??
  'com.googleusercontent.apps.PLACEHOLDER-REPLACE-WITH-IOS-CLIENT-ID';

const config: ExpoConfig = {
  name: 'Coreo',
  slug: 'coreo',
  owner: 'vipincoreos-team',
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
      NSCameraUsageDescription:
        'Coreo uses your camera to read your meal, so you can log it without typing.',
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
    permissions: [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      // Health Connect read access (issue #55): the five metrics the device-import endpoint
      // accepts, plus reading while the app is closed. Read-only — no write permission is declared.
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_SLEEP',
      'android.permission.health.READ_HEART_RATE_VARIABILITY',
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.READ_EXERCISE',
      'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND',
    ],
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
    // Check-in nudge (issue #47). `defaultChannel` matches the channel the app creates before
    // asking for permission (features/notifications/lib/expoPush.ts), so server pushes land in it.
    ['expo-notifications', { defaultChannel: 'default' }],
    ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }],
    // Health Connect (issue #55). Its plugin adds the permission-rationale screen Android requires.
    // Health Connect needs minSdk 26; the library asks for compile/target SDK 36.
    'react-native-health-connect',
    [
      'expo-build-properties',
      { android: { minSdkVersion: 26, compileSdkVersion: 36, targetSdkVersion: 36 } },
    ],
    // Periodic sync while the app is closed (Android WorkManager under the hood).
    'expo-background-task',
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
    // Client IDs are public identifiers (not secrets). The web ID must equal the backend's
    // GOOGLE_CLIENT_ID: the backend checks the identity token's audience against it.
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // Links this app to its EAS project (builds, credentials, updates). Not a secret.
    eas: { projectId: 'dcb9efd0-ff95-47e2-aff3-c15233310f72' },
  },
};

export default config;
