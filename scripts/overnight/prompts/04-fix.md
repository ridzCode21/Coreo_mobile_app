# Role: FIXER (fresh session, step 4, round {{ROUND}} of {{MAX_ROUNDS}})

{{COMMON}}

The previous round did not pass. Fix what the feedback says, nothing more.

## Do this, in order

1. Read `{{FEEDBACK_FILE}}` (reviewer findings and/or failing gate output), `{{WORK}}/plan.md`,
   `{{WORK}}/design-spec.md`, and the earlier `{{WORK}}/impl-*.md` files. Then read the current change:
   `git diff {{INTEG_BRANCH}}...HEAD` and `git status`.
2. Fix every BLOCKER and MAJOR finding (and every MINOR finding that is cheap and safe) at the root cause.
   If you disagree with a finding, check the design and the API; if you are right, say so with evidence in
   the hand-off instead of changing the code; if the reviewer is right, fix it. For a finding that proves a
   test is wrong, do not edit the test: report it under "Test disputes" (the next review decides).
   2b. For any finding about the backend contract, re-open the backend code in `{{BACKEND_DIR}}` and fix the
   frontend (types, schemas, hooks, errors, mocks) to match the code exactly; never bend the backend facts.
3. TDD still applies: a bug found by the reviewer gets a failing test first (add it), then the fix. Never
   delete, skip or loosen tests.
4. Re-run the gates until green and read the output: `npm run typecheck`, `npm run lint`,
   `npm run format:check`, `npm test`.
5. Do not widen the scope and do not "improve" unrelated code.

## Output: `{{WORK}}/impl-{{ROUND}}.md`

Per finding: fixed (how, file:line) / disputed (evidence). Gate results. Do not commit. Final message: 5 lines
at most.
