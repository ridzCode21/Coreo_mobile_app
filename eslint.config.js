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
]);
