/* global __dirname */
// https://docs.expo.dev/guides/using-eslint/
const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

// Feature-boundary rules (docs/architecture.md §2 "Import rules"). Features are read from the
// folders in src/features/, so a new feature is covered without touching this file.
const features = fs
  .readdirSync(path.join(__dirname, 'src/features'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const deepImportMessage = (feature) =>
  `Import from '@/features/${feature}' (its index.ts), not its internal files. ` +
  "Export what you need from the feature's index.ts first (docs/architecture.md §2).";

const restrictFeatureInternals = (allowedFeature) => ({
  patterns: features
    .filter((feature) => feature !== allowedFeature)
    .map((feature) => ({
      group: [`@/features/${feature}/**`],
      message: deepImportMessage(feature),
    })),
});

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    // designs/ holds raw/extracted design source (see designs/README.md), not app code.
    ignores: ['dist/*', 'designs/**'],
  },
  // A feature may import another feature only through that feature's index.ts. (A rule set per
  // location, not per feature: flat config replaces a rule's options instead of merging them.)
  ...features.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: { 'no-restricted-imports': ['error', restrictFeatureInternals(feature)] },
  })),
  {
    // Routes are wiring only: they use a feature's public surface, never its internals.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', restrictFeatureInternals(null)] },
  },
  {
    // Shared code is feature-agnostic: it must not depend on any feature.
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message:
                'src/shared must not import from features. Move the code into the feature, or ' +
                'promote what both need into src/shared (docs/architecture.md §2).',
            },
          ],
        },
      ],
    },
  },
  {
    // The one sanctioned exception: the mock backend's single wiring point imports each
    // feature's mock handlers so they self-register (docs/architecture.md §4).
    files: ['src/shared/api/mock/registerAllMocks.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // `eslint-plugin-react-hooks` v6+ (pulled in by eslint-config-expo's recommended config)
    // bundles the React Compiler's static analysis rules (`immutability`, `set-state-in-effect`,
    // `refs`). Those rules assume a value returned by a hook is only ever mutated in the one
    // "owning" effect/handler — a model react-native-reanimated's `SharedValue`s intentionally
    // violate by design (`.value` is mutated from multiple gesture callbacks and effects,
    // deliberately, to drive UI-thread animation without React re-renders). This project doesn't
    // opt into the React Compiler (not in CLAUDE.md's tech stack), so these rules only produce
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
