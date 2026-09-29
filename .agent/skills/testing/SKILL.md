---
name: testing
description: >-
  Guidance for writing and reviewing tests (Jest, React Native Testing Library, Maestro) once
  testing infrastructure is set up in this project. Use when the user asks to add tests, when
  test config is being introduced, or when reviewing whether a feature is adequately tested.
disable-model-invocation: true
---

# Testing

**Current phase note:** per `AGENTS.md` §7, test infrastructure (Jest/RNTL/Maestro configs) is
intentionally not installed yet. This skill defines the target approach so code is written in a
testable way now, and applies fully once infra is added — don't install test tooling proactively
unless asked.

## Instructions

### Write testable code even before test infra exists

- Keep business logic in plain functions/hooks separable from JSX so it can be unit-tested
  without deep component mounting.
- Avoid side effects buried inside components — push them into hooks/functions with clear
  inputs/outputs.
- Query/mutation hooks and Zod schemas are natural unit-test seams once Jest is added.

### Once Jest + React Native Testing Library are installed

- **Unit tests** for pure functions, Zod schemas, and store logic (Zustand actions).
- **Component tests** (RNTL) for feature components: render, assert on accessible
  roles/labels/text — not on implementation details (no snapshot-only tests as the sole
  coverage).
- Co-locate test files next to the code (`Component.test.tsx` beside `Component.tsx`) or in a
  `__tests__` folder within the feature — pick one convention and stay consistent.
- Mock the network boundary (`shared/api/client.ts`), not individual `fetch` calls scattered
  around, so tests don't depend on implementation of a specific hook.

### Once Maestro is installed

- Cover critical end-to-end flows first: onboarding → first login, logging a workout,
  completing a core loop relevant to the app's MVP (see `docs/product-context.md`). Don't try to
  cover every screen with e2e tests — that's what component tests are for.
- Keep Maestro flows short and named after the user journey they verify
  (`login-flow.yaml`, `log-workout-flow.yaml`).

### What "adequately tested" means for a feature (once infra exists)

- Happy path covered.
- At least one error/empty state covered.
- Any non-trivial validation logic (Zod schema, business rule) has direct unit coverage.
- A critical user journey gets Maestro coverage, not every minor feature.
