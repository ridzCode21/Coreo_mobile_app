# CLAUDE.md — Operating Manual for Claude Code

Single source of truth for how Claude Code works in this repository. Read it in full before doing
any work. If it conflicts with a request in chat, follow this file unless the user explicitly
overrides it for the current task.

## 1. What we're building

A **production-grade mobile fitness app** (React Native / Expo) shipping to real users on the App
Store and Play Store. Not a prototype — decisions must survive updates, scale, and store review.

Product vision, users, and scope: [`docs/product-context.md`](docs/product-context.md) (see §8).

## 2. Repository map

```
CLAUDE.md                  # this file
app.config.ts              # Expo app config (env-aware — see docs/architecture.md §6)
docs/
  product-context.md       # product vision, users, market context, feature scope
  architecture.md          # folder structure, data flow, state
  design-system.md         # design tokens/components
  coding-standards.md      # TypeScript/React Native conventions, lint/format rules
  feature-map.md           # feature ↔ API ↔ design-screen mapping + phasing status
  API_REFERENCE.md         # the real backend contract
  implementation-plan.md   # design→screens build plan (mock-API architecture, phasing)
.agent/skills/             # task playbooks to consult (see §4)
designs/                   # source design exports — see designs/README.md
src/
  app/                     # Expo Router routes (file-based, (public)/(auth)/(app) groups)
  features/                # feature modules (screens delegate to these)
  shared/                  # theme tokens, api client + mock layer, hooks, shared components
```

- Routes live under `src/app/`, not a root `app/`. Don't invent another top-level layout without
  updating `docs/architecture.md` first.
- The mock API layer (`src/shared/api/transport/` + `src/shared/api/mock/`, toggled by
  `EXPO_PUBLIC_API_MODE`) follows the real `API_REFERENCE.md` contract. Read
  `docs/architecture.md` §4 and `docs/implementation-plan.md` §2 before adding an endpoint.
- **Expo/RN APIs change fast.** `expo` is pinned to ~57.0.7. If you're not certain an Expo/RN API
  is current, check `https://docs.expo.dev/versions/v57.0.0/` instead of relying on memory.

## 3. Tech stack (non-negotiable defaults)

Use exactly this stack unless the user says otherwise for a specific task. Don't add libraries
that overlap with it.

| Concern               | Choice                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Framework             | Expo + React Native + TypeScript (strict)                                                      |
| Dev workflow          | Expo **development builds** (`expo-dev-client`) — never Expo Go for real feature work          |
| Native layer          | React Native New Architecture (the only architecture as of RN 0.86)                            |
| Routing               | Expo Router with **typed routes**                                                              |
| Server/API state      | TanStack Query (queries, mutations, cache, retries, pagination)                                |
| Client/UI state       | Zustand — small, global, non-server state only (auth flags, theme, onboarding, feature flags)  |
| Forms & validation    | React Hook Form + Zod (schemas shared between form validation and API payload typing)          |
| Secrets/tokens        | `expo-secure-store` — the only place tokens or sensitive values are persisted                  |
| Camera/photo          | `expo-image-picker` (photo meal-logging) and `expo-camera` (barcode scanning) — see note below |
| Crash/perf monitoring | Sentry (deferred — §7)                                                                         |
| Testing               | Jest + React Native Testing Library + Maestro (deferred — §7)                                  |
| Release pipeline      | EAS Build, Update, Submit, Workflows                                                           |

Camera note: both are nutrition-only and isolated — `features/nutrition/lib/photoCapture.ts` and
`features/nutrition/components/BarcodeScannerView.tsx`. Install with
`npx expo install expo-image-picker expo-camera`.

Rationale: [`docs/architecture.md`](docs/architecture.md). Conventions (naming, file structure,
lint, components): [`docs/coding-standards.md`](docs/coding-standards.md).

## 4. Playbooks (`.agent/skills/`)

Not auto-loaded — open the relevant `SKILL.md` at the right point in a task.

| Skill                                                                           | Open it when...                                                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`product-analysis`](.agent/skills/product-analysis/SKILL.md)                   | Starting any new feature/request — before writing a plan or code                          |
| [`feature-planning`](.agent/skills/feature-planning/SKILL.md)                   | Turning an analyzed idea into a concrete implementation plan                              |
| [`react-native-architecture`](.agent/skills/react-native-architecture/SKILL.md) | Deciding where code lives, which state tool to use, navigation structure                  |
| [`responsive-ui`](.agent/skills/responsive-ui/SKILL.md)                         | Building or modifying any screen/component                                                |
| [`testing`](.agent/skills/testing/SKILL.md)                                     | Writing or reviewing tests (once test infra exists)                                       |
| [`security-review`](.agent/skills/security-review/SKILL.md)                     | Touching auth, tokens, storage, permissions, network calls, or before finishing a feature |
| [`pr-review`](.agent/skills/pr-review/SKILL.md)                                 | Before declaring any task "done"                                                          |

## 5. How to approach every task (decision framework)

For anything beyond a trivial one-line fix, work through these steps in order and say which step
you're on:

1. **Understand like a product owner** — `product-analysis`: who is it for, what job does it do,
   how do comparable apps (Strava, Fitbod, Nike Training Club, MyFitnessPal) handle it, MVP slice
   vs. later. If `docs/product-context.md` doesn't answer, say so and ask, or state a
   clearly-labeled assumption — never silently guess product intent.
2. **Plan** — `feature-planning`: screens/routes touched, data needed, where state lives (query /
   store / form), components to build or reuse, edge cases (loading/empty/error/offline),
   acceptance criteria.
3. **Architect** — `react-native-architecture` for folder placement and state ownership; also
   `responsive-ui` for any UI work.
4. **Implement** — follow `docs/coding-standards.md` and §11. Extend existing feature modules
   rather than creating parallel structures.
5. **Self-review** — `security-review` if the change touches auth, tokens, storage, permissions,
   or network; then always `pr-review` as the final gate.

Skip steps only for genuinely trivial changes (typos, copy tweaks, config values) and say so.

## 6. Guardrails

- TypeScript strict; no `any` unless justified in a comment.
- Feature-based structure only: no God-folders (e.g. `components/` holding whole screens), and no
  business logic in `app/` route files — routes stay thin and delegate to `src/features/*`.
- Server data always goes through TanStack Query — never fetch-and-`useState`. If you're tempted
  to cache server data in Zustand, it belongs in TanStack Query.
- Zustand stays small and client-only.
- Tokens and sensitive values never touch `AsyncStorage`, plain state, or logs — only
  `expo-secure-store`.
- No hardcoded design values (colors, spacing, type sizes) in components — use tokens from
  `docs/design-system.md`.
- Flag any new dependency that overlaps with §3 to the user before adding it.

## 7. Explicitly deferred (don't set up yet, but design for it)

Do **not** install or configure yet: testing infra (Jest/RNTL/Maestro, CI test runs) and Sentry.
Keep code testable (pure functions, isolated hooks, no logic buried in components) and observable
(centralized error-handling points where Sentry will hook in) so adding them later is cheap.

## 8. Working with the docs

`docs/product-context.md` and `docs/design-system.md` are populated (see `docs/design-system.md`
§8–9 for open items: an unconfirmed navigation pattern, and screens that are ahead of current MVP
scope). When a task needs them:

1. Check there first — the answer is usually there.
2. If not, make the smallest reasonable assumption, label it as an assumption in your response,
   and suggest the doc be updated.
3. Never invent visual values (colors, spacing, radii, type sizes) outside
   `docs/design-system.md`. If a component isn't covered, extend the doc first (or ask) rather
   than freelance a one-off style.

## 9. Definition of done

- [ ] Follows `docs/architecture.md`, `docs/coding-standards.md`, and the guardrails in §6.
- [ ] UI works across common phone sizes and both platforms (`responsive-ui`).
- [ ] `npm run typecheck`, `npm run lint`, and `npm run format:check` pass with no new warnings —
      run them and read the output; don't assume.
- [ ] `pr-review` checklist passed.
- [ ] UI changes compared against the design (§13) before pushing.
- [ ] New product/design assumptions are called out to the user.

Git hooks (husky) run `lint-staged` (eslint + prettier on staged files) on commit and `typecheck`
on push. They install on `npm install`; never bypass them with `--no-verify`.

## 10. Git workflow & branching

- `main` = production, `development` = integration. Only the repo owner merges into either. This
  is a process rule, not a technical lock (branch protection is unavailable on the current GitHub
  plan) — never push or merge directly to `main` or `development`.
- Branch off `development` (off `main` only for hotfixes):
  - `feature/<issue-number>-<short-slug>`, e.g. `feature/12-meal-photo-logging`
  - `hotfix/<short-slug>` — branched off `main`, merged back into both `main` and `development`
- When asked to start a ticket/issue, create the branch with this naming automatically — don't ask
  and don't invent another scheme. No issue number yet: ask for one, or use the board item title
  as the slug.
- PRs from feature branches target `development`, never `main`.
- Commit and push only when the user asks.

## 11. Folder placement

Each `src/features/<feature>/` is a self-contained module with these subfolder roles:

- `screens/` — screens rendered by routes
- `components/` — feature-specific UI
- `api/` — API calls and query/mutation hooks
- `lib/` — feature-specific pure logic
- `store/` — small client-only Zustand stores
- `mocks/` — mock-API fixtures
- `schemas.ts` / `index.ts` — Zod schemas and types / the feature's public exports

Cross-feature code lives in `src/shared/` (`api`, `components`, `constants`, `hooks`, `lib`,
`stores`, `theme`, `types`, `utils`).

Put a new file in the existing subfolder whose role matches. Create a new directory only when none
fits, name it consistently with this list (`lib/`, not `helpers/` or `logic/`), and say why before
creating it. Never add a new feature module for something that belongs inside an existing one.

## 12. Tooling & communication

- **code-simplifier**: after a non-trivial edit (new functions, refactors, multi-file changes —
  not one-line fixes), run the `code-simplifier` agent on the changed files before calling the
  task done, without being asked.
- **claude-md-management**: when a session teaches something durable about the project
  (convention, gotcha, workflow change), run the `claude-md-improver` skill to fold it into this
  file rather than only mentioning it in chat. Run it again at the end of longer sessions.
- **Plain language in chat** (not in code): prefer everyday words; on first use of a technical
  term, give the full name or a one-line meaning in parentheses; don't stack unexplained acronyms
  or error codes. Code, file paths, API field names, and commit messages stay exact.

  ```
  # BAD:  Invalidate the RQ cache post-mutation via onSettled.
  # GOOD: After the save finishes, refresh the cached list (`queryClient.invalidateQueries`)
  #       so the screen shows the new item.
  ```

## 13. Design alignment before push

After a task's code is committed and before `git push` or opening a PR:

1. Read the design for the task: the cited screen in `designs/`, the issue text,
   `docs/design-system.md`, and any plan/spec in `docs/` or `docs/superpowers/specs/`.
2. Compare the committed behavior to it: copy, fields, counts, empty states, and when the feature
   runs.
3. Don't push while they disagree. If the code is wrong, fix it, commit, and re-check.
4. If the design must change, don't edit the design files. Give the user one paste-ready prompt
   for the designer / Claude Design, then wait; push only after they confirm the design is
   updated. The prompt names the screen (file and id), the exact copy or layout to change, and
   why the shipped behavior requires it.
