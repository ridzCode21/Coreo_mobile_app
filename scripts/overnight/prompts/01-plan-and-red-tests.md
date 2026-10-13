# Role: PLANNER and TEST AUTHOR (Claude, fresh session, step 1 of 4)

{{COMMON}}

You do NOT write production code in this step. You decide exactly what must be built, and you write the
failing tests that define "done". A different agent (Codex) will then implement to make your tests pass, and
a third fresh session will review the result against the design. Your plan and tests are the contract.

## Do this, in order

1. Orient: read `CLAUDE.md`, the whole issue file, `{{WORK}}/design-spec.md`, and then the code the issue
   points at (open each cited file at the cited lines; confirm the issue's claims are still true today).
   Check `git log --oneline -15` and `git status`: earlier issues in this run are already merged into this
   branch, so build on them. If `{{WORK}}/plan.md` or earlier hand-off files exist from an interrupted
   attempt, continue from them instead of starting over.
2. Skills (invoke with the Skill tool): `superpowers:using-superpowers`, then
   `superpowers:brainstorming` (no interview: choose the simplest design that satisfies the issue and the
   Claude Design, note the choice), `superpowers:writing-plans`, and the repo playbooks in CLAUDE.md §5:
   `product-analysis`, `feature-planning`, `react-native-architecture`, `responsive-ui`. For issues touching
   auth, tokens, storage, permissions or network also read `app-security-review` now and plan for it.
3. Backend alignment (mandatory, before design extraction is finished): for every endpoint, field, enum, error
   and limit this issue touches, open the backend CODE in `{{BACKEND_DIR}}` (use `{{REFS}}/backend-urls.txt`, then
   view, serializer, model, permissions, throttles) and write down what it really does, with `file:line`. Compare
   with the issue, the docs and the current frontend client, schemas and mocks, and list every mismatch. This
   decides what is buildable now and what is Partial/Blocked.
   3b. Design extraction: for every screen and state the issue lists, write the exact copy, element order,
   every state the design shows (empty, loading, error, offline, success, calibrating, quota reached...),
   what each tap does and where it goes, and the tokens/sizes. Compare with the backend contract and say
   which data comes from which endpoint (or mock). Decide anything the issue leaves open and record it.
4. Scope check (Blocked/Partial protocol in the ground rules). Decide now, before tests are written. Tier
   `partial`/`hold` issues must name precisely what is out of scope.
5. **Write the failing tests first** (`superpowers:test-driven-development`): create test files under
   `tests/regression/<feature>/` (named after what they protect, `.test.ts` for pure logic, `.test.tsx` for
   components and screens). Cover: every exact copy string and element the design requires, every state and
   error path, every interaction (what a tap calls/navigates to), data mapping/derivation rules, and the
   regressions the issue describes (for a bug issue, a test that reproduces the bug). Add contract tests for every
   request and response the change touches: assert the exact request payload and the response mapping against the
   field names, types and error codes found in the backend code (cite the backend `file:line` in a comment). Use React Native
   Testing Library for UI (query by text/role, never by implementation details; no snapshots of whole
   screens), mock the API at the mock layer or the hook, and add small test helpers in `tests/` if several
   tests need them. Tests must be deterministic and fast.
6. Run the new tests with `npx jest <files>` and confirm they FAIL for the right reason (missing behaviour,
   not a typo or a broken import). Fix the tests until they fail correctly. Paste the failing summary into the
   plan. A `TEST_EXEMPT: <reason>` line is only for an issue with NO testable behaviour at all (then list no
   TEST_FILES). It does not apply to part of an issue: if some parts are untestable (for example a type-only
   change), say so in plain prose, not as a `TEST_EXEMPT:` line, and still list the tests for the rest. The runner
   always runs the RED check on listed test files. Copy, structure, state and token values are almost always
   testable (token values can be asserted from `src/shared/theme/tokens.ts`).

## Output: `{{WORK}}/plan.md` (exactly these headings)

```
# Plan for #{{NUM}}
## Decision log            (choices made, conflicts between issue/design/docs and how resolved)
## Design requirements     (per screen/state: exact copy table, order, interactions, tokens)
## Backend alignment       (REQUIRED, per endpoint: method + URL, backend `file:line` (urls, view, serializer),
                            request/response fields and errors as the CODE defines them, mismatches with the
                            docs / the current frontend client / the mocks, what the backend does NOT provide)
## Data and API            (endpoint or mock per datum; mock changes needed; what is NOT available)
## Files to create or change   (path: what and why; keep inside the right feature folder)
## Test plan               (what each test file protects)
TEST_FILES:
- tests/regression/<feature>/<name>.test.tsx
## Acceptance checklist    (numbered; each item observable and mapped to a design line or API field;
                            the reviewer will check every one)
## Out of scope / Blocked  (or "none")
## Risks and review focus  (what a strict reviewer should look at)
```

Allowed file edits in this step: `tests/**` and `{{WORK}}/**` only (the runner enforces this). Finish with a
5-line summary: tests written, RED confirmed or exempt, scope (full / PARTIAL / BLOCKED), key risk.
