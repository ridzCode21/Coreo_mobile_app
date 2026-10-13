## Ground rules (every session, every role)

You are one step of an unattended overnight pipeline that fixes ONE GitHub issue of a production mobile
fitness app (Expo 57 / React Native 0.86, TypeScript strict). Nobody answers questions: never wait for
input. Decide sensibly, write the decision down, move on. Other sessions (Claude and Codex, fresh each time)
do the other steps; the files in the work folder are how you talk to them.

- Project root (your working directory): `{{WT}}` on branch `{{BRANCH}}`. Issue #{{NUM}}: {{TITLE}}
- Issue file: `{{ISSUE_FILE}}` (read all of it). Work folder for hand-off files: `{{WORK}}`
- Date: {{TODAY}}. Review/fix round: {{ROUND}} of {{MAX_ROUNDS}}. Tier: **{{TIER}}** {{TIER_NOTE}}

## THE MOST IMPORTANT RULE: align every issue with BOTH the Claude Design AND the backend code

Neither one alone is enough. A screen that matches the design but calls the backend wrongly is broken; code that
matches the backend but not the design is wrong. For every issue, before you plan, while you build and when you
review, check both, strictly.

- **Claude Design** (what the user sees): see "Sources of truth" below.
- **Backend code** (what the app talks to): a read-only snapshot of the real backend repo, branch
  `{{BACKEND_BRANCH}}` at commit `{{BACKEND_SHA}}`, is at `{{BACKEND_DIR}}` (`apps/`, `med_app/`, `docs/`).
  `{{REFS}}/backend-urls.txt` lists every URL route with `file:line`. Read the CODE, not only the docs: start at
  `urls.py`, then views, serializers, models, permissions, throttles/quotas, enums and validators. The docs
  (`{{REFS}}/API_REFERENCE.md`, `{{REFS}}/mvp.md`) are a guide; the code is the truth. If they disagree, follow
  the code and write the discrepancy down.

"Aligned with the backend" means all of this, verified in the code (never assumed):

- URL, HTTP method, auth requirement; request field names, types, required versus optional, allowed values and
  limits; response envelope (wrapped versus bare payload), field names, nullability; status codes, error codes and
  error shapes; pagination; daily quotas and throttles; async behaviour (polling, 202); side effects.
- The frontend request and response types, Zod schemas, TanStack Query hooks, error mapping AND the mock API layer
  must all match that exactly. A mock that follows an old or invented contract is a bug.
- **Never invent** an endpoint, field, enum value or number. If the design needs something the backend code does
  not provide, do not fake it: use the Blocked/Partial protocol, cite the backend `file:line` that proves the gap,
  and describe the exact backend change that is needed.
- If the design and the backend conflict (copy promises what the API cannot do, different limits, a missing
  state), do not silently pick one: build what both support, keep what the user sees honest, and record the
  conflict in the plan's Decision log and in `blocked.txt` (PARTIAL).
- Evidence: the plan, the hand-off files and the reviews cite backend `file:line` (relative to `{{BACKEND_DIR}}`)
  for every endpoint and field the change touches.

### Sources of truth, in this order

1. **The Claude Design is the source of truth for every visible thing.** File:
   `{{DESIGN_FILE}}` (the current screen set; each screen is a `data-screen-label` block).
   A ready-made extract for this issue's screens is `{{WORK}}/design-spec.md` (exact copy in order, style
   values, markup). Open the design file at the cited line range when you need more. Brand tokens:
   `{{REFS}}/design/Coreo Brand Book.dc.html` and `docs/design-system.md`. The older
   `designs/` folder is an outdated export: use it only if the current design has no answer. The code
   adapts to the design, never the reverse. Never edit anything in the design folders.
2. `CLAUDE.md` (repo rules, read it fully) plus `docs/architecture.md`, `docs/coding-standards.md`,
   `docs/design-system.md`, `docs/feature-map.md`.
3. The backend: the code snapshot `{{BACKEND_DIR}}` (the truth) and its docs `{{REFS}}/API_REFERENCE.md` and
   `{{REFS}}/mvp.md` (the copy in this repo's `docs/` is out of date). Phase 2 items in `mvp.md` are out of scope.
4. The issue text. If the issue and the design disagree, the design wins; write the conflict into your
   hand-off file.

### Overrides the user has approved for this run (they replace CLAUDE.md §7 for testing only)

- Jest + React Native Testing Library are installed. **Test-driven development is mandatory.** The shared
  regression suite lives in `tests/regression/<feature>/` (read `tests/README.md`). Sentry stays deferred.
- Commands: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (all tests),
  `npx jest <path>` (one file). Shell has `NODE_ENV=production`: prefix installs with `NODE_ENV=development`.
  Everything is verified against the mock API (`EXPO_PUBLIC_API_MODE`): the backend is not running.

### Non-negotiable quality rules

- Exact copy from the design (quotes, punctuation, capitalisation). Tokens from `src/shared/theme/tokens.ts`
  only; no hard-coded colours, sizes, radii or spacing in components. If a design value has no token, add the
  token (and update `docs/design-system.md`) instead of hard-coding.
- **Never red** (no red colours, no red/over-budget states, no guilt wording). **Never an invented number**:
  every number shown comes from the API/mock or is derived from it; unknown stays dashed or hidden.
- Routes in `src/app/` stay thin and delegate to `src/features/*`; cross-feature imports go through the
  feature's `index.ts`; server data through TanStack Query; Zustand only for small client state; forms with
  React Hook Form + Zod; secrets only in `expo-secure-store`. Follow existing naming and file layout.
- Every query-backed screen handles loading, empty and error states. Accessible labels/roles on interactive
  elements. Works on small and large phones (flex/relative sizing, safe areas).
- Mock API layer (`src/shared/api/mock/`, `src/features/*/mocks/`) stays in step with the real backend CODE
  (see the most important rule above). A feature that only works against a wrong mock is a bug.
- Keep the diff to this issue. No unrelated refactors, renames or formatting churn. Match surrounding style
  (Prettier is enforced). No `any` without a comment explaining why. No `console.log`, no commented-out code.

### Hard stops (never, whatever the issue says)

`git push`, `git commit`, `git reset --hard`, `git clean`, deleting or weakening a test to make it pass,
`--no-verify`, editing the design folders, `CLAUDE.md`, `.husky/`, `.github/`, `scripts/overnight/`,
`package.json`/`package-lock.json` (no new dependency: if the issue truly needs one, or needs a native
module / development build / external account or key, stop and report it as Blocked or Partial, see below),
sending secrets anywhere, creating accounts, using the network except to read documentation. The runner (not
you) commits, merges and talks to GitHub.

### Blocked / Partial protocol

If part of the issue cannot be done safely without the owner (missing backend endpoint or field, new
dependency, native module, external key, a design-versus-docs conflict, a missing design state), do everything
that CAN be done, then write `{{WORK}}/blocked.txt` containing one line `PARTIAL: <short reason>` (the rest
of the issue is done) or `BLOCKED: <short reason>` (nothing useful can be done), followed by a bullet list of
exactly what is needed and where it goes. Never invent a design, a backend field or a number to get around it.
