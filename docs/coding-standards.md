# Coding Standards

Concrete conventions for writing code in this repo. Pairs with
[`docs/architecture.md`](architecture.md) (where things live) — this doc is about how code is
written once you know where it goes.

## 1. TypeScript

- `strict: true`. No `any` — use `unknown` + narrowing, or a real type. If genuinely unavoidable,
  add `// TODO(reason): why any is needed` next to it.
- No non-null assertions (`!`) as a substitute for real narrowing/validation.
- Prefer `type` for data shapes/unions, `interface` for objects meant to be extended
  (e.g. component props that a caller might extend).
- Export types alongside the code that owns them (`schemas.ts`/`types.ts` per feature), not in a
  single global `types.ts` dumping ground.
- Derive types from Zod schemas (`z.infer<typeof schema>`) instead of hand-writing a parallel
  type that can drift from validation.

## 2. File & folder naming

- Components: `PascalCase.tsx` (`WorkoutCard.tsx`).
- Hooks: `useCamelCase.ts` (`useWorkoutTimer.ts`).
- Everything else (utils, stores, schemas, api modules): `camelCase.ts`.
- One primary export per file; the export name matches the file name.
- Screen components rendered by a route live in `features/*/screens/SomeScreen.tsx`; the route
  file in `app/` just renders it.

## 3. Component conventions

- Function components only, typed props via an explicit `type Props = {...}` (not inline object
  types in the signature for anything non-trivial).
- Keep components focused: if a component's render function needs scrolling to read, extract
  subcomponents or hooks.
- No business logic (data fetching, validation, formatting rules) inline in JSX — pull into hooks
  or plain functions so it's testable independent of rendering.
- Always handle loading/empty/error states explicitly for anything backed by a query — no bare
  `data.map(...)` without checking `isLoading`/`isError`/empty-array first.
- Style with the design-system primitives and tokens (`docs/design-system.md`) — no ad-hoc
  hardcoded colors, spacing, or font sizes once tokens exist.

## 4. State management (see architecture.md §3 for the decision table)

- One Zustand store per concern; expose actions from the store, don't mutate state from outside
  it.
- TanStack Query: one query-key factory per feature (e.g. `workoutKeys.detail(id)`), colocated
  with the query hooks in `features/*/api`. Mutations invalidate via the same factory — never
  hardcode key arrays at call sites.
- Zod schema is the single source of truth for a form: build the RHF resolver and the submit
  payload type from the same schema.

## 5. Imports

- Use path aliases (`@/features/...`, `@/shared/...`) once configured — no `../../../..` chains.
- Import only from a feature's `index.ts` when consuming it from outside that feature.
- Group imports: external packages, then internal aliases, then relative — keep the ordering
  consistent (enforced by lint config once set up, e.g. `eslint-plugin-import`/`simple-import-sort`).

## 6. Error handling

- Never swallow errors silently (`catch {}`). At minimum log through the shared `reportError()`
  seam (`docs/architecture.md` §7).
- User-facing errors get a translated, human message; raw error objects/stack traces never render
  in UI.
- Validate all external input (API responses you don't fully trust, deep link params, form input)
  with Zod at the boundary before using it.

## 7. Formatting & linting

- ESLint (Expo/React Native config) + Prettier once installed — don't hand-format against the
  grain of what the formatter will produce. Prefer running the formatter over manual spacing
  decisions.
- No commented-out code left in commits. Delete it (git history has it if needed).
- No console.log left in committed code for anything beyond a clearly temporary debug session —
  remove before finishing a task.

## 8. Accessibility & platform correctness

- All interactive elements have an accessible label/role (`accessibilityLabel`, appropriate
  `accessibilityRole`).
- Respect safe areas (`react-native-safe-area-context`) — no hardcoded top/bottom padding
  assuming a notch-free device.
- Don't assume iOS-only or Android-only behavior without an explicit `Platform.select`/`.ios.`/`.android.`
  file split when behavior genuinely diverges.

## 9. Commits

- Small, scoped commits with conventional-style messages: `feat(workouts): add session summary
  screen`, `fix(auth): handle expired refresh token`.
- A commit that touches a feature's public contract (`index.ts` exports, API shape) mentions that
  explicitly in the message body.

## 10. Git workflow

- **`main`** — release-ready code only. Nothing is committed here directly; it only receives
  merges from `development` when cutting a release.
- **`development`** — the active integration branch and base for all work. This is the "main
  source" in day-to-day terms; branch from here, and merge back here.
- **Feature/fix branches** — cut from `development`, named `feature/<short-name>` or
  `fix/<short-name>` (e.g. `feature/design-system-setup`, `fix/token-refresh`). Merge back into
  `development` via PR (even a self-reviewed one) rather than committing straight to
  `development` for anything non-trivial.
- Keep branches scoped to one task/feature so they can merge independently — don't let a branch
  drift into unrelated work.
