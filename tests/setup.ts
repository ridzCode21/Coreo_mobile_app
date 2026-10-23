/** Shared Jest setup for every test (tests/README.md). Keep this file small: only mocks that
 * every test needs because a native module has no JS implementation under Jest. */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// `expo-network` is a native module with no JS implementation under Jest. Default to a reachable
// connection; tests that need "offline" use `useConnectivityStore.getState().setSimulatedOffline`
// (the same switch the mock API uses) or set the store's network snapshot directly.
jest.mock('expo-network', () => ({
  __esModule: true,
  NetworkStateType: { NONE: 'NONE', UNKNOWN: 'UNKNOWN', WIFI: 'WIFI', CELLULAR: 'CELLULAR' },
  getNetworkStateAsync: jest.fn(async () => ({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// React Native 0.86 exposes these development/settings modules through lazy public getters.
// Tests that inspect the public module can evaluate those getters, so provide the native pieces
// that do not exist in Jest before React Native is loaded.
jest.mock('react-native/src/private/devsupport/devmenu/specs/NativeDevMenu', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    reload: jest.fn(),
    setProfilingEnabled: jest.fn(),
    setHotLoadingEnabled: jest.fn(),
  },
}));

jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: () => ({ settings: {} }),
    setValues: jest.fn(),
    deleteValues: jest.fn(),
  },
}));

// The upstream `react-native-reanimated/mock` re-imports the real `./index`, which requires
// `react-native-worklets`' native module and crashes under Jest. This small stub covers exactly the
// API the app uses today (WaveChart, AnimatedSplash, SliderRow): extend it when the app starts
// using more, not before.
jest.mock('react-native-reanimated', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  const identity = (value: unknown) => value;
  // Real shared values keep their identity across renders, so back the stub with a ref.
  const useStableValue = (initial: unknown) => useRef({ value: initial }).current;
  // The animation finishes immediately; completion callbacks run so code that chains on them works.
  const withTiming = (
    toValue: unknown,
    _config?: unknown,
    callback?: (finished: boolean) => void,
  ) => {
    callback?.(true);
    return toValue;
  };

  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: identity },
    Easing: {
      cubic: identity,
      out: (easing?: unknown) => easing ?? identity,
    },
    useSharedValue: useStableValue,
    useAnimatedStyle: (factory?: () => unknown) => (factory ? factory() : {}),
    useAnimatedProps: (factory?: () => unknown) => (factory ? factory() : {}),
    withTiming,
    runOnJS:
      <T extends (...args: never[]) => unknown>(fn: T) =>
      (...args: Parameters<T>) =>
        fn(...args),
    // `react-native-gesture-handler`'s `GestureDetector` (used by `SliderRow` and any other
    // drag component built the same way) reads `Reanimated.useEvent` from this same package at
    // render time, even in a plain (non-Animated) mount — without a stub, mounting any such
    // component throws "Reanimated.useEvent is not a function" before a single gesture fires.
    useEvent: () => undefined,
  };
});

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

// The Google Sign-In native module has no JS implementation under Jest. Tests that need specific
// behaviour override `GoogleSignin.signIn` etc.; the defaults below resolve to a signed-in user.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({
      type: 'success',
      data: {
        idToken: 'mock-google-id-token',
        user: { id: 'g-1', email: 'maya@example.com', givenName: 'Maya', familyName: 'Chen' },
      },
    })),
    signOut: jest.fn(async () => null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
}));
