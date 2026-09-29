---
name: feature-planning
description: >-
  Turn an analyzed feature idea into a concrete, buildable implementation plan — screens/routes,
  data and state ownership, components, and edge cases. Use after product-analysis and before
  writing any code for a non-trivial feature or change.
disable-model-invocation: true
---

# Feature Planning

## Instructions

Take the output of `.agent/skills/product-analysis/SKILL.md` and turn it into a concrete plan
using the template below. Keep it short — a plan that takes longer to read than the feature
takes to build has failed its purpose.

Before finalizing, open `.agent/skills/react-native-architecture/SKILL.md` to confirm folder
placement and state ownership decisions are consistent with the rest of the app.

## Plan template

```markdown
### Feature: <name>

**Job to be done:** <one line, from product-analysis>

**Routes/screens:**
- <app/... route> → <src/features/<feature>/screens/...>

**Data & state:**
- Server data needed: <resource> → TanStack Query hook in `features/<feature>/api`
- Client/global state needed (if any): <what> → Zustand store/slice
- Forms: <form> → RHF + Zod schema in `features/<feature>/schemas.ts`

**Components:**
- New: <component> (feature-local unless reused elsewhere)
- Reused from `src/shared/components`: <list>

**Edge cases to handle explicitly:**
- Loading / empty / error states
- Offline or slow network behavior (if relevant)
- Permission/auth edge cases (if relevant)

**Out of scope for this pass:** <what's explicitly deferred>

**Acceptance criteria:**
- [ ] <user-observable behavior 1>
- [ ] <user-observable behavior 2>
```

## Notes

- If the feature needs an API endpoint that doesn't exist yet, note the expected request/response
  shape in the plan (as a Zod schema if practical) so the query/mutation hook can be written
  against a clear contract even before the backend is ready.
- If the plan reveals the feature doesn't cleanly fit an existing feature folder, decide the new
  feature folder name now, not mid-implementation.
- Keep acceptance criteria observable by a user/tester, not implementation details.
