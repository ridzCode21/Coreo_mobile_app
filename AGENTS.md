# AGENTS.md — Operating Manual for Coding Agents

This file is the **single source of truth** for any AI coding agent (Cursor, Claude Code, or
otherwise) working in this repository. Every other agent-entry file (e.g. `CLAUDE.md`) points
back here instead of duplicating content. Read this file in full before doing any work.

If something here conflicts with a request in chat, prefer this file unless the user explicitly
overrides it for the current task.

## 1. What we're building

A **production-grade, market-deliverable mobile fitness app** built with React Native/Expo. This
is not a prototype or a learning project — every decision should be made as if it is shipping to
real users on the App Store / Play Store and needs to survive updates, scale, and review.

The full product vision, target users, and feature scope live in
[`docs/product-context.md`](docs/product-context.md). That file is a living document and is
currently a skeleton — see §5 for how to behave while it's incomplete.

## 2. Repository map

```
AGENTS.md                  # you are here — the operating manual
CLAUDE.md                  # stub that points Claude Code back to this file
docs/
  product-context.md       # product vision, users, market context, feature scope
  architecture.md           # technical architecture — folder structure, data flow, state
  design-system.md          # design tokens/components (populated once Figma design lands)
  coding-standards.md       # TypeScript/React Native conventions, lint/format rules
.agent/skills/              # task-specific playbooks the agent must consult (see §4)
```

As the app is scaffolded, code will live under `app/` (Expo Router routes) and `src/` (feature
modules, shared code) per [`docs/architecture.md`](docs/architecture.md). Do not invent a
different top-level layout without updating that doc first.

## 3. Tech stack (non-negotiable defaults)

Unless the user explicitly says otherwise for a specific task, use exactly this stack. Don't
introduce alternative libraries that overlap with something already on this list.

| Concern | Choice |
|---|---|
| Framework | Expo + React Native + TypeScript (strict mode) |
| Dev workflow | Expo **development builds** (`expo-dev-client`) — never Expo Go for real feature work |
| Native layer | React Native **New Architecture** enabled |
| Routing | Expo Router, with **typed routes** enabled |
| Server/API state | TanStack Query (queries, mutations, cache, retries, pagination) |
| Client/UI state | Zustand — small, global, non-server state only (auth session flags, theme, onboarding, feature flags) |
| Forms & validation | React Hook Form + Zod (shared schemas between form validation and API payload typing) |
| Secrets/tokens | `expo-secure-store` — the only place auth tokens or sensitive small values are persisted |
| Crash/perf monitoring | Sentry (deferred — see §7) |
| Testing | Jest + React Native Testing Library + Maestro (deferred — see §7) |
| Release pipeline | EAS Build, Update, Submit, Workflows |

Full rationale and how these fit together live in
[`docs/architecture.md`](docs/architecture.md). Coding conventions (naming, file structure,
lint rules, component patterns) live in
[`docs/coding-standards.md`](docs/coding-standards.md).

## 4. Playbooks (`.agent/skills/`)

These are **not** auto-loaded — proactively open and follow the relevant one at the right point
in a task. Each is a self-contained `SKILL.md`.

| Skill | Open it when... |
|---|---|
| [`product-analysis`](.agent/skills/product-analysis/SKILL.md) | Starting any new feature/request — before writing a plan or code |
| [`feature-planning`](.agent/skills/feature-planning/SKILL.md) | Turning an analyzed idea into a concrete implementation plan |
| [`react-native-architecture`](.agent/skills/react-native-architecture/SKILL.md) | Deciding where code lives, which state tool to use, navigation structure |
| [`responsive-ui`](.agent/skills/responsive-ui/SKILL.md) | Building or modifying any screen/component |
| [`testing`](.agent/skills/testing/SKILL.md) | Writing or reviewing tests (once test infra exists) |
| [`security-review`](.agent/skills/security-review/SKILL.md) | Touching auth, tokens, storage, permissions, network calls, or before finishing a feature |
| [`pr-review`](.agent/skills/pr-review/SKILL.md) | Before declaring any task "done" |

## 5. How to approach every task (decision framework)

Don't jump straight to code. For anything beyond a trivial one-line fix, work through these
steps in order and be explicit (in your response) about which step you're on:

1. **Understand & think like a product owner** — open `product-analysis`. Ask: who is this for,
   what job does it do, how do comparable fitness apps (Strava, Fitbod, Nike Training Club,
   MyFitnessPal) handle this, what's the MVP slice vs. what's a later iteration. If
   `docs/product-context.md` doesn't yet answer this, say so explicitly and either ask the user
   or make a clearly-labeled reasonable assumption — never silently guess at product intent.
2. **Plan** — open `feature-planning`. Produce a short plan: screens/routes touched, data
   needed, where state lives (query vs. store vs. form), components to build/reuse, edge cases
   (loading/empty/error/offline), acceptance criteria.
3. **Architect** — open `react-native-architecture` to confirm folder placement and state
   ownership before writing files. For any UI work also open `responsive-ui`.
4. **Implement** — follow `docs/coding-standards.md` exactly. Prefer editing/extending existing
   feature modules over creating parallel structures.
5. **Self-review before finishing** — run `security-review` if the change touches auth, tokens,
   storage, permissions, or network, then always run `pr-review` as a final gate.

Skip steps only for genuinely trivial changes (typo fixes, copy tweaks, config value changes),
and say that you're skipping them.

## 6. Guardrails

- TypeScript strict mode, no `any` unless justified in a comment.
- Feature-based structure only — no God-folders like `components/` holding entire screens, no
  business logic in `app/` route files (routes should be thin and delegate to `src/features/*`).
- Server data always goes through TanStack Query — never fetch-and-`useState` for anything that
  comes from an API.
- Zustand stores stay small and client-only; if you're tempted to cache server data in a Zustand
  store, that's a sign it belongs in TanStack Query instead.
- Tokens/sensitive values never touch `AsyncStorage`, plain state, or logs — only
  `expo-secure-store`.
- No design values (colors, spacing, type sizes) hardcoded in components once
  `docs/design-system.md` has tokens — reference tokens instead.
- Don't add new dependencies that duplicate something already in §3 without flagging it to the
  user first.

## 7. Explicitly deferred (don't set up yet, but design for it)

Per current project phase, do **not** install/configure the following yet, but write code in a
way that won't fight them when they're added later:

- Testing infra (Jest/RNTL/Maestro configs, CI test runs).
- Sentry SDK/config.

Architecture should still keep things testable (pure functions, isolated hooks, no logic buried
in components) and observable (centralized error handling points where Sentry will later hook
in), so adding these later is low-friction.

## 8. Working with incomplete docs

`docs/product-context.md` and `docs/design-system.md` are intentionally skeletons right now —
product context and the visual design are being finalized separately. When a task needs
information from either:

1. Check if it's already there.
2. If not, make the smallest reasonable assumption needed to keep moving, label it clearly as an
   assumption in your response, and suggest the doc be updated.
3. For visual/design specifics (exact colors, spacing scale, component look) — don't invent a
   design system from scratch; use sensible temporary/neutral values behind the token
   architecture described in `docs/design-system.md` so real values can be dropped in later
   without refactoring.

## 9. Definition of done

Before calling any task complete:

- [ ] Follows the folder structure and state-management rules in `docs/architecture.md`.
- [ ] Follows `docs/coding-standards.md`.
- [ ] No secrets/tokens outside SecureStore; no server data outside TanStack Query.
- [ ] UI works across common phone sizes and both platforms (see `responsive-ui` skill).
- [ ] `pr-review` checklist passed.
- [ ] Any new assumptions made about product/design are called out to the user.
