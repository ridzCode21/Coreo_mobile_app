# Coreo — Mobile Health App

Cross-pillar health app (diet, fitness, wellness — one AI-aware experience instead of three
disconnected apps) built with Expo + React Native + TypeScript.

`main` holds **production code only** and is empty until the first release. All active
development happens on `development` and feature branches cut from it (see below).

## Start here

- [`CLAUDE.md`](CLAUDE.md) — operating manual for any coding agent working in this repo
  (tech stack, architecture rules, required workflow). Read this first.
- [`docs/product-context.md`](docs/product-context.md) — product brief: problem, users, MVP
  scope, constraints.
- [`docs/architecture.md`](docs/architecture.md) — folder structure, state management, data
  flow.
- [`docs/design-system.md`](docs/design-system.md) — design tokens/components.
- [`docs/coding-standards.md`](docs/coding-standards.md) — conventions, including the git
  workflow below.
- [`docs/getting-started.md`](docs/getting-started.md) — backend integration, running locally, good
  first tasks.

## Branching

- `main` — production code only (empty until the first release); receives merges from
  `development` at release time. Only the repo owner merges here.
- `development` — active integration branch; base for all work.
- `feature/<issue-number>-<short-slug>` — cut from `development`, merged back via PR.
- `hotfix/<short-slug>` — cut from `main`, merged into both `main` and `development`.

Full rules: `CLAUDE.md` §10.
