---
name: pr-review
description: >-
  Final self-review checklist against this project's architecture, coding standards, and state
  management rules before considering any task or change complete. Use as the last step before
  declaring a task done, or when explicitly asked to review a diff/PR.
disable-model-invocation: true
---

# PR Review

## Instructions

Run through this checklist against the diff before calling a task finished. This is the final
gate referenced in `AGENTS.md` §9 — it assumes `security-review` has already run if the change
touched auth/tokens/storage/network/permissions.

### Architecture (`docs/architecture.md`)

- [ ] New code sits in the correct feature folder, or in `shared/` only if genuinely used by 2+
      features.
- [ ] Route files (`app/*`) stay thin — no business logic leaked into them.
- [ ] No cross-feature imports reaching into another feature's internals (only its `index.ts`).
- [ ] Server data uses TanStack Query; client state uses Zustand; forms use RHF + Zod — no
      mixing/duplication (e.g. no server data cached in Zustand, no manual fetch+useState).
- [ ] Query key factories used consistently, not ad-hoc key arrays.

### Coding standards (`docs/coding-standards.md`)

- [ ] TypeScript strict, no unexplained `any`/`!`.
- [ ] Naming/file conventions followed (component/hook/file naming, one primary export per
      file).
- [ ] Loading/empty/error states handled for anything backed by a query.
- [ ] No hardcoded design values where tokens exist; no leftover `console.log` or commented-out
      code.
- [ ] Errors are not swallowed silently; external input is validated at the boundary.

### UI (`responsive-ui` skill)

- [ ] Works across small and large phone sizes conceptually (flex/relative sizing, not fixed
      pixels).
- [ ] Safe areas respected; accessible labels/roles present on interactive elements.

### Product fit

- [ ] The change actually delivers the job-to-be-done identified in `product-analysis`/the
      feature plan — not just "code that compiles."
- [ ] Any assumptions made about missing product/design context are surfaced to the user, not
      buried silently.

## Output

Report back concisely: what passed, what was fixed during review, and anything flagged as a
known gap or assumption that needs user input. Don't just say "looks good" — name the specific
checks that were relevant and confirmed.
