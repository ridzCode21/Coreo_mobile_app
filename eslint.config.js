// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    // designs/ holds raw/extracted design source (see designs/README.md), not app code.
    ignores: ['dist/*', 'designs/**'],
  },
  {
    // `eslint-plugin-react-hooks` v6+ (pulled in by eslint-config-expo's recommended config)
    // bundles the React Compiler's static analysis rules (`immutability`, `set-state-in-effect`,
    // `refs`). Those rules assume a value returned by a hook is only ever mutated in the one
    // "owning" effect/handler — a model react-native-reanimated's `SharedValue`s intentionally
    // violate by design (`.value` is mutated from multiple gesture callbacks and effects,
    // deliberately, to drive UI-thread animation without React re-renders). This project doesn't
    // opt into the React Compiler (not in AGENTS.md's tech stack), so these rules only produce
    // false positives on `useSharedValue` usage here, not real bugs — see SliderRow.tsx's gesture
    // handlers for the pattern they misflag.
    files: ['src/shared/components/SliderRow.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);
