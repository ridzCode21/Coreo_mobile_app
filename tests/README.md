# Tests

One shared test suite for the whole app. Anyone adding or changing a feature runs it before
pushing, so existing features keep working.

```bash
npm test                  # everything (tests/** and src/**/*.test.*)
npm run test:regression   # only tests/regression, the shared suite (fast, no device needed)
npm run test:ci           # CI mode (no watch, fails on obsolete snapshots)
```

## Layout

```
tests/
  setup.ts                 shared Jest setup (native-module mocks only)
  regression/
    INDEX.md               what each test file protects (kept up to date, one row per test file)
    <feature>/             one folder per feature: foundation, onboarding, auth, home, nutrition, ...
      <name>.test.ts(x)    pure logic uses .ts, screens and components use .tsx
```

## Rules

- **Test first (TDD).** Write the failing test, watch it fail, then write the code. A test that
  never failed proves nothing.
- Test behaviour a user can see (copy, states, what a tap does) or a pure rule. Do not test
  implementation details or snapshot whole screens.
- Import app code with the `@/` alias (`@/features/...`), exactly like the app does.
- No network and no real storage: mock the API layer (`src/shared/api/mock`) or the hook. Native
  modules that have no JS version are mocked once in `tests/setup.ts`.
- Name the file after the thing it protects, and add a row to `regression/INDEX.md`.
- Never delete or weaken a regression test to make a change pass. If behaviour changed on
  purpose, update the test and say why in the PR.
- No red colours anywhere, and never an invented number: copy and values come from the design
  or the API.

## Adding a test for a new feature

1. Create `tests/regression/<feature>/<name>.test.tsx`.
2. Write the test, run `npx jest tests/regression/<feature>/<name>.test.tsx`, see it fail.
3. Build the feature until it passes, then run `npm run test:regression` and `npm test`.
4. Add the row to `tests/regression/INDEX.md`.
