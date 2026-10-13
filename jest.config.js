// Jest must load React's development build: `React.act` does not exist in the production build, so
// component tests crash with "actImplementation is not a function". Some shells and CI images export
// NODE_ENV=production, so force the test environment here instead of relying on the caller.
process.env.NODE_ENV = 'test';

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
