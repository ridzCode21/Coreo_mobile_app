---
name: run-all-tasks
description: >-
  Start, resume, monitor or stop the overnight runner that fixes the open design-gap GitHub issues
  autonomously, one fresh Claude + Codex pair of sessions per issue (plan and tests, implement, review,
  fix, commit). Use when the user says run-all-tasks, run all tasks, start the overnight run, fix all the
  issues overnight, or asks for its status or report.
disable-model-invocation: true
argument-hint: '[status | stop | stop-now | dry-run | trial | only N | max N | retry-blocked | include-hold | report | sync]  (empty = run everything)'
allowed-tools: Bash(bash scripts/overnight/run-all-tasks.sh:*), Bash(nohup bash scripts/overnight/run-all-tasks.sh:*), Bash(sleep:*), Bash(tail:*), Bash(ls:*), Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git worktree list:*)
---

# run-all-tasks

You are only the SUPERVISOR. Do NOT fix any issue yourself, and do not edit code, issue files, prompts, the
state folder or the runner. `scripts/overnight/run-all-tasks.sh` does the work: for every issue it starts brand-new
sessions (Claude plans and writes the failing tests, Codex implements, the runner runs typecheck, lint, format
and all tests, Claude reviews strictly against the Claude Design, Codex fixes, repeat until the review passes),
then rebases onto the current `development`, pushes the issue branch, opens a pull request, merges it into `development`
and deletes the branch (so no branches pile up). Only the runner pushes, never an agent. It stops by
itself when both usage limits are hit and resumes from the first open issue when started again.
Every issue must align with both the Claude Design and the backend code (branch `feat/initial`, read as a snapshot);
the runner enforces this in the plan step and the review. Details: `scripts/overnight/README.md`.

Requested action: `$ARGUMENTS` (empty means "run everything").

## Steps

1. Run `bash scripts/overnight/run-all-tasks.sh --status` and keep the output.
2. Decide from the argument:
   - `status` -> show the table and stop.
   - `report` -> run `bash scripts/overnight/run-all-tasks.sh --report` and show it. Stop.
   - `sync` -> run `bash scripts/overnight/run-all-tasks.sh --sync` (refreshes issue files from GitHub). Stop.
   - `stop` -> `--stop` (finishes the current issue, then stops). `stop-now` -> `--stop-now`. Show the result. Stop.
   - `dry-run` -> run it with `--dry-run`, show the output. Stop.
   - `trial` -> start with `--only 21` (a small, safe issue) so the user can inspect one full cycle first.
   - `only N` (or a bare number) -> `--only N`. `max N` -> `--max-issues N`.
   - `retry-blocked` -> `--retry-blocked`. `include-hold` -> `--include-hold`.
   - empty -> start with no options.
3. If the status says the runner is already RUNNING, do not start a second one. Tell the user how to watch it.
4. Start it detached, so it keeps going after this chat ends:
   `nohup bash scripts/overnight/run-all-tasks.sh <options> > scripts/overnight/.state/nohup.out 2>&1 &`
   then `sleep 20`, then `bash scripts/overnight/run-all-tasks.sh --status` and
   `tail -8 scripts/overnight/.state/runner.log`.
5. If the output says `PRE-FLIGHT FAILED`, do not work around it. Read `scripts/overnight/README.md` ("Before the
   first run"), tell the user exactly what is missing (for example: the setup is not committed, the tree has
   uncommitted changes, or the baseline checks fail) and the command to fix it. Never edit the runner to skip a check.
6. Do NOT poll in a loop or wait for it to finish (that wastes tokens). Reply briefly with:
   - what was started (or why not) and which issue it is on,
   - watch: `tail -f scripts/overnight/.state/runner.log`; table: `/run-all-tasks status`,
   - stop: `/run-all-tasks stop`; morning summary: `/run-all-tasks report`,
   - that each finished issue is merged into `development` through its own pull request and the branch is deleted
     (work happens in the worktree `../django_frontend-overnight`; your own tree is untouched), and that blocked or
     partial issues are listed in the report with what is needed from the user.
7. If the runner is not RUNNING after the start, say so and give the fallback to run in a normal terminal:
   `cd /Users/Nuvo/Vipin/vipin/django_frontend && bash scripts/overnight/run-all-tasks.sh`
