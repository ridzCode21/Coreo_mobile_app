/** Shared Jest setup for every test (tests/README.md). Keep this file small: only mocks that
 * every test needs because a native module has no JS implementation under Jest. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The upstream `react-native-reanimated/mock` re-imports the real `./index`, which in turn
// requires `react-native-worklets`' native module and crashes under Jest (it needs a custom
// resolver we can't wire up from here — jest.config.js is out of scope for this change). A small
// hand-written stub covering the handful of APIs this codebase actually calls (WaveChart,
// AnimatedSplash, SliderRow) avoids that chain entirely.
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  const identity = (value: unknown) => value;
  const Easing = {
    linear: identity,
    ease: identity,
    quad: identity,
    cubic: identity,
    sin: identity,
    circle: identity,
    exp: identity,
    bounce: identity,
    poly: () => identity,
    elastic: () => identity,
    back: () => identity,
    bezier: () => identity,
    in: (easing?: unknown) => easing ?? identity,
    out: (easing?: unknown) => easing ?? identity,
    inOut: (easing?: unknown) => easing ?? identity,
  };

  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    Easing,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory?: () => unknown) => (factory ? factory() : {}),
    useAnimatedProps: (factory?: () => unknown) => (factory ? factory() : {}),
    useDerivedValue: (factory?: () => unknown) => ({ value: factory ? factory() : undefined }),
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    withDecay: (toValue: unknown) => toValue,
    withRepeat: (animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[animations.length - 1],
    runOnJS:
      <T extends (...args: never[]) => unknown>(fn: T) =>
      (...args: Parameters<T>) =>
        fn(...args),
    runOnUI:
      <T extends (...args: never[]) => unknown>(fn: T) =>
      (...args: Parameters<T>) =>
        fn(...args),
    cancelAnimation: () => undefined,
    interpolate: (value: unknown) => value,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

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
