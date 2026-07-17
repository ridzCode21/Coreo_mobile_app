# Coreo — Mobile Health App

Cross-pillar health app (diet, fitness, wellness — one AI-aware experience instead of three
disconnected apps) built with Expo + React Native + TypeScript.

This is the `main` branch: **release-ready code only**, kept intentionally minimal until the
first release is cut. All active development happens on `development` and feature branches cut
from it (see below).

## Start here

- [`AGENTS.md`](AGENTS.md) — operating manual for any coding agent working in this repo
  (tech stack, architecture rules, required workflow). Read this first.
- [`docs/product-context.md`](docs/product-context.md) — product brief: problem, users, MVP
  scope, constraints.
- [`docs/architecture.md`](docs/architecture.md) — folder structure, state management, data
  flow.
- [`docs/design-system.md`](docs/design-system.md) — design tokens/components (in progress).
- [`docs/coding-standards.md`](docs/coding-standards.md) — conventions, including the git
  workflow below.

## Branching

- `main` — release-ready only, receives merges from `development` at release time.
- `development` — active integration branch; base for all work.
- `feature/<name>` / `fix/<name>` — cut from `development`, merged back via PR.

Full detail in `docs/coding-standards.md` §10.
