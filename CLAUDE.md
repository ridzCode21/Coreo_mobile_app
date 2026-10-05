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
CLAUDE.md                  # this file — the only place rules are written
AGENTS.md                  # signpost for Cursor/Codex/other tools; points here, holds no rules
app.config.ts              # Expo app config (env-aware — see docs/architecture.md §6)
docs/
  product-context.md       # product vision, users, market context, feature scope
  architecture.md          # folder structure, data flow, state
  design-system.md         # design tokens/components
  coding-standards.md      # TypeScript/React Native conventions, lint/format rules
  feature-map.md           # feature ↔ API ↔ design-screen mapping + phasing status
  API_REFERENCE.md         # the real backend contract
  implementation-plan.md   # design→screens build plan (mock-API architecture, phasing)
.claude/skills/             # task playbooks to consult (see §4)
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

## 4. Playbooks (`.claude/skills/`)

Task playbooks: `product-analysis`, `feature-planning`, `react-native-architecture`,
`responsive-ui`, `security-review`, `design-alignment`, `pr-review`, `testing`. Each is
`.claude/skills/<name>/SKILL.md`. Claude Code runs them as `/<name>` skills (most are manual-only,
so invoke them yourself at the right step in §5); other tools must open the file by path.

## 5. How to approach every task

Use the playbooks at these points, in order, and say which step you're on. Invoke each one with
the Skill tool (or open its `SKILL.md`) at that moment, not from memory. Skip steps only for
genuinely trivial changes (typos, copy tweaks, config values) and say so.

1. **Request arrives** (new feature, screen, or behavior change) → `product-analysis`, before any
   plan or code. If `docs/product-context.md` doesn't answer, ask or state a labeled assumption;
   never silently guess product intent.
2. **Idea is clear, before writing code** → `feature-planning` for a short plan (screens, data,
   state, edge cases, acceptance criteria).
3. **Before creating files or choosing a state tool** → `react-native-architecture`. Also
   `responsive-ui` before building or editing any screen or component.
4. **Implement** — follow `docs/coding-standards.md`; extend existing feature modules.
5. **Change touches auth, tokens, storage, permissions, or network** → `security-review`, before
   finishing.
6. **Before every commit that touches UI** → `design-alignment`; warn the user on any difference
   (§13).
7. **Before saying "done"** → `pr-review`, always. Writing or reviewing tests → `testing` (once
   test infra exists, §7).

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
  `docs/design-system.md`. Never invent visual values outside it: extend the doc first (or ask).
- Flag any new dependency that overlaps with §3 to the user before adding it.

## 7. Explicitly deferred (don't set up yet, but design for it)

Do **not** install or configure yet: testing infra (Jest/RNTL/Maestro, CI test runs) and Sentry.
Keep code testable (pure functions, isolated hooks, no logic buried in components) and observable
(centralized error-handling points where Sentry will hook in) so adding them later is cheap.

## 8. Working with the docs

Check `docs/` first (product-context, design-system, architecture). If the answer isn't there,
make the smallest reasonable assumption, label it, and suggest the doc be updated. Details:
[`product-analysis`](.claude/skills/product-analysis/SKILL.md).

## 9. Definition of done

Run the [`pr-review`](.claude/skills/pr-review/SKILL.md) checklist before calling a task done. It
includes `npm run typecheck`, `npm run lint` and `npm run format:check` (read the output; don't
assume). Git hooks (husky) run `lint-staged` on commit and `typecheck` on push; never bypass them
with `--no-verify`.

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

Features are self-contained modules in `src/features/<feature>/` (`screens/`, `components/`,
`api/`, `lib/`, `store/`, `mocks/`); cross-feature code lives in `src/shared/`. Put a new file in
the existing subfolder whose role matches; say why before creating a new directory. Full rules:
[`react-native-architecture`](.claude/skills/react-native-architecture/SKILL.md).

## 12. Tooling & communication

- **Other tools (Cursor, Codex, etc.):** `AGENTS.md` is a signpost, not a rulebook. Claude files
  (`CLAUDE.md`, `.claude/`) are primary; a tool's own config files apply too, and on conflict this
  file wins. If you change a non-negotiable below in `AGENTS.md`'s summary, change it in
  `CLAUDE.md` first.
- **code-simplifier**: after a non-trivial edit (new functions, refactors, multi-file changes),
  run the `code-simplifier` agent on the changed files before calling the task done, unasked.
- **claude-md-management**: when a session teaches something durable, run the `claude-md-improver`
  skill to fold it in here (or into the matching skill) rather than only mentioning it in chat.
- **Plain language in chat** (not in code): prefer everyday words; on first use of a technical
  term, give the full name or a one-line meaning in parentheses; don't stack unexplained acronyms
  or error codes. Code, file paths, API field names, and commit messages stay exact.

  ```
  # BAD:  Invalidate the RQ cache post-mutation via onSettled.
  # GOOD: After the save finishes, refresh the cached list (`queryClient.invalidateQueries`)
  #       so the screen shows the new item.
  ```

## 13. Design alignment before commit

The Claude Design in `designs/` is the source of truth for every UI change: the code adapts to the
design, never the reverse. Before every commit that touches UI, run the
[`design-alignment`](.claude/skills/design-alignment/SKILL.md) playbook and **warn the user before
committing** if anything differs. Don't edit the design files.
