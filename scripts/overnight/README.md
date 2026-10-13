# Overnight runner (Claude + Codex)

Fixes the open design-gap issues of this repo on its own, one issue after another, using **both** Claude Code
and Codex CLI so one provider's usage limit does not end the night. Every agent call is a fresh session, so each
issue gets a full context window. Start it with the skill: `/run-all-tasks` (supervisor, starts the script
detached) or run `bash scripts/overnight/run-all-tasks.sh` in a terminal.

## What happens to each issue

| Step               | Who                           | What                                                                                                                                                                 | Output                              |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1 Plan + red tests | **Claude** (fresh)            | reads the issue and the Claude Design extract, decides scope, writes the **failing tests** first (TDD) in `tests/regression/<feature>/`                              | `plan.md`, tests                    |
| 2 Implement        | **Codex** (fresh)             | makes the tests pass, to the design, tokens only, mock API in step                                                                                                   | code, `impl-N.md`                   |
| 3 Gates            | **runner**                    | `typecheck`, `lint`, a strict `eslint . --max-warnings 0` (also covers `tests/`, which `npm run lint` skips), `format:check`, all tests: the runner runs them itself | `gates-N.txt`                       |
| 4 Review           | **Claude** (fresh, read-only) | strict code review (pr-review), design alignment, security review when needed, test quality, simplifier                                                              | `review-N.md`, `VERDICT: PASS/FAIL` |
| 5 Fix              | **Codex** (fresh)             | fixes the findings, then back to 3. Up to `MAX_ROUNDS` (4). Same feedback twice in a row: the other provider implements that round                                   | `impl-N.md`                         |
| 5b Polish          | **Codex** (fresh)             | after a PASS, one pass for the reviewer's MINOR findings (safe fixes only); every gate is re-run and the pass is thrown away if one fails. `POLISH_MINOR=0` skips it | `impl-N-polish.md`                  |
| 6 Finalize         | **runner**                    | gates again, forbidden-file check, `tests/regression/INDEX.md` row, local commit, merge into the integration branch, GitHub comment                                  | commit                              |

Why this split: Claude does the high-judgement work (what exactly to build, what "done" means, and the independent
review), Codex does the high-volume work (writing and fixing code). The tests are written by someone other than
the implementer, and the reviewer is a fresh session that did not write the code. The review-fix loop is the
"ralph loop" (repeat until the expectation is met), with a real judge (gates + review) and a round cap.

If one provider hits its usage limit the other takes over that role (logged as `DEGRADED`). If both are limited the
runner sleeps (`LIMIT_WAIT_MINUTES`, default 30) and retries for up to `LIMIT_WAIT_MAX_HOURS` (default 7), then stops with
exit code 75; running it again continues from the first open issue.

## Before the first run (once)

The runner works in a separate git worktree and branch, so your own working tree is never touched. The worktree
starts from your last commit, so the setup must be committed first. On a branch (never directly on `development`):

```bash
git checkout -b chore/overnight-runner
git add .gitignore .prettierignore package.json package-lock.json tsconfig.json jest.config.js \
        tests scripts/overnight .claude/skills/run-all-tasks
git commit -m "chore: overnight runner (Claude + Codex), Jest test infrastructure, regression suite"
```

Then check that everything is ready:

```bash
bash scripts/overnight/selftest/run-selftest.sh      # no tokens: fake agents, whole flow
bash scripts/overnight/run-all-tasks.sh --dry-run    # shows the order and the first prompt
```

Agents read the design and backend docs from read-only snapshots in `.state/refs/` (refreshed at each start), never from the real folders.

Needs: `claude` and `codex` logged in, `gh` logged in (issue comments), the design folder
`Coreo Design System Rebuild/` next to the code, the backend docs at `../django_app/django_app/docs`
(`BACKEND_DOCS=...` to change). `/ralph-loop` state in `.claude/ralph-loop.local.md` is ignored by the runner;
cancel an old loop with `/ralph-loop:cancel-ralph` if one is still active.

First real trial: `/run-all-tasks trial` (issue #21, small). Read its commit and `.state/work/021/`, then run everything.

## Commands

```bash
bash scripts/overnight/run-all-tasks.sh                  # run everything runnable
bash scripts/overnight/run-all-tasks.sh --status         # table
bash scripts/overnight/run-all-tasks.sh --dry-run
bash scripts/overnight/run-all-tasks.sh --only 35        # one issue
bash scripts/overnight/run-all-tasks.sh --max-issues 3
bash scripts/overnight/run-all-tasks.sh --include-hold   # also the held-back issues (treated as partial)
bash scripts/overnight/run-all-tasks.sh --retry-blocked  # blocked and failed issues again
bash scripts/overnight/run-all-tasks.sh --sync           # refresh issue files from GitHub
bash scripts/overnight/run-all-tasks.sh --report         # morning summary
bash scripts/overnight/run-all-tasks.sh --stop           # after the current issue
bash scripts/overnight/run-all-tasks.sh --stop-now
tail -f scripts/overnight/.state/runner.log              # watch live
```

## Settings (environment variables)

`CLAUDE_MODEL`, `CLAUDE_EFFORT`, `CODEX_MODEL` (empty = your defaults), `BUDGET_USD` (cap per Claude session),
`MAX_ATTEMPTS` (2), `MAX_ROUNDS` (4), `ALLOW_FALLBACK` (1), `LIMIT_WAIT_MINUTES` (30), `LIMIT_WAIT_MAX_HOURS` (7),
`POLISH_MINOR` (1), `GH_COMMENT` (1: comment on each GitHub issue, never closes it), `BASE_BRANCH`, `INTEG_BRANCH`
(`chore/overnight-runner`), `WORKTREE_DIR` (`../django_frontend-overnight`), `REPO_SLUG`, `BACKEND_DOCS`.

## Which issues run

`queue.tsv` sets the order and the tier. **run**: whole issue. **partial**: do what is possible, report the rest
(backend field missing, undesigned state, owner decision) as PARTIAL. **hold**: skipped (new dependency, native
module, device, account, or backend work that does not exist yet) unless `--include-hold`. Foundation first:
tokens (#52), shared background and glass (#53), signup contract (#8).

## Safety

- Nothing is pushed; no merge into `development` or `main`. Work lands on `feature/N-slug` branches, merged with
  `--no-ff` into `chore/overnight-runner` in the worktree. Husky hooks run on every commit and are never bypassed.
- Agents cannot touch the design folders, `CLAUDE.md`, `.husky/`, `.github/`, `.claude/`, `package.json` or the lockfile,
  or `scripts/overnight/`; Claude's planner and reviewer are read-only for `src/` (permissions file per role, plus the
  runner checks the tree after each step and undoes anything not allowed). A change that needs a new dependency is
  reported as blocked or partial, not installed.
- Progress truth is `status.tsv` and git. The runner is safe to stop and start at any time; an interrupted issue resumes.
- Sessions use the mock API; the backend is not running overnight. Live checks stay on the issue's "How to verify".
- Each issue costs real tokens (about $0.2 of fixed overhead per Claude session, plus the work). Set `BUDGET_USD` to cap it.

## In the morning

1. `/run-all-tasks report` (or `--report`): done, partial, blocked, failed, with what each needs from you.
2. Review the local branches: `git -C ../django_frontend-overnight log --oneline chore/overnight-runner`.
   Each issue is one commit on its `feature/N-slug` branch. The reviewer's notes are in `.state/work/NNN/review-*.md`,
   decisions in `plan.md`, anything to confirm under "Notes for the owner".
3. Run the app on a device against the mock API and compare with the design (the agents compare code to design,
   not pixels).
4. Push the branches you accept and open PRs to `development` (CLAUDE.md §10: only you merge). Close issues when merged.
5. `tests/regression/INDEX.md` lists what each new test protects; `npm run test:regression` runs the shared suite.

## Files

`run-all-tasks.sh` (runner), `prompts/` (what each role is told; edit to change behaviour), `queue.tsv`, `issues/`
(synced from GitHub, `--sync`), `claude-settings/` (per-role permissions), `lib/` (helpers), `selftest/`,
`.state/` (git-ignored: `status.tsv`, `runner.log`, `logs/`, `work/NNN/` hand-off files, `refs/` backend doc snapshot).
