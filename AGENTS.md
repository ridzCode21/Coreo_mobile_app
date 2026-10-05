# Agent instructions

All rules for this repo live in `CLAUDE.md`. Read it in full before any work. Do not add or edit
rules here — this file only points to them.

**Claude files are primary.** Follow `CLAUDE.md` and the playbooks in `.claude/skills/`. If your
tool has its own config files (for example `.cursor/rules/`), follow those too. If they conflict,
`CLAUDE.md` wins.

Playbooks — open the one that matches your task: `.claude/skills/<name>/SKILL.md`

- `product-analysis`, `feature-planning` — before planning a new feature
- `react-native-architecture`, `responsive-ui` — where code lives; building any screen
- `security-review`, `pr-review` — before calling a task done
- `design-alignment` — before every commit that touches UI
- `testing` — once test tooling exists

Non-negotiables if you read nothing else (full text in `CLAUDE.md`):

- Never push or merge to `main` or `development`; branch per `CLAUDE.md` §10.
- Never use `--no-verify`; commit and push hooks must pass.
- UI must match the Claude Design in `designs/` exactly; warn the user before committing any difference.
- Tokens and secrets only in `expo-secure-store`; no hardcoded design values.
