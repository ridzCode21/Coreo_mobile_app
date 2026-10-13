/** Jest config. `npm test` runs everything; `npm run test:regression` runs the shared regression
 * suite in tests/regression (see tests/README.md). */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/Coreo Design System Rebuild/'],
  modulePathIgnorePatterns: ['<rootDir>/Coreo Design System Rebuild/'],
};
