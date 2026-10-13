#!/usr/bin/env bash
# End-to-end self-test of the runner with fake agents, a fake `gh` and a bare "GitHub" remote in throwaway git
# repos. No tokens are spent and nothing real is touched.
#   bash scripts/overnight/selftest/run-selftest.sh        (KEEP=1 keeps the temp dir for inspection)
set -u
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
T="$(mktemp -d)"; trap '[ "${KEEP:-0}" = 1 ] || { chmod -R u+w "$T" 2>/dev/null; rm -rf "$T"; }' EXIT; [ "${KEEP:-0}" = 1 ] && echo "keeping $T"
PASS=0; FAIL=0
BK="$T/backend"; mkdir -p "$BK/docs" "$BK/apps/x" "$T/bin"
( cd "$BK" && git init -q -b feat/initial . && git config user.email t@t && git config user.name t \
  && echo api > docs/API_REFERENCE.md && echo mvp > docs/mvp.md && printf 'urlpatterns = [path("x/", view)]\n' > apps/x/urls.py \
  && git add -A && git commit -q -m "fake backend" )
cp "$SRC/scripts/overnight/selftest/fake-gh.sh" "$T/bin/gh"; chmod +x "$T/bin/gh"
ok() { echo "  ok   - $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL - $1"; FAIL=$((FAIL+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1  [$2]"; fi; }

new_repo() { # dir   (NAME must be set: it names the fake GitHub remote)
  local R="$1"; mkdir -p "$R" && cd "$R" && git init -q -b development .
  git config user.email t@t; git config user.name t
  mkdir -p scripts tests/regression/foundation src node_modules/.bin "Coreo Design System Rebuild"
  tar -C "$SRC/scripts" --exclude=overnight/.state -cf - overnight | tar -C scripts -xf -; rm -rf scripts/overnight/issues/*   # never copy a real run's read-only .state
  cat > scripts/overnight/queue.tsv <<'Q'
1	run	first
2	partial	second
3	hold	held back
Q
  for n in 1 2 3; do printf '# 00%s - Fake issue %s\n\n| Field | Value |\n| --- | --- |\n| Screens | 8a |\n\n## Summary\nx\n' "$n" "$n" > "scripts/overnight/issues/00$n-fake-issue-$n.md"; done
  printf '<div data-screen-label="8a Save your core">Hello</div>\n' > "Coreo Design System Rebuild/Coreo App Screens.dc.html"
  cat > package.json <<'P'
{"name":"t","scripts":{"typecheck":"node check.js","lint":"true","format:check":"true","test":"node check.js"}}
P
  echo "const fs=require('fs');for(const f of fs.readdirSync('src').filter(x=>x.endsWith('.ts'))){if(fs.readFileSync('src/'+f,'utf8').includes('BROKEN')){console.error('BROKEN in '+f);process.exit(1);}}" > check.js
  printf '#!/bin/sh\n[ -f .impl-done ] && exit 0 || exit 1\n' > node_modules/.bin/jest; chmod +x node_modules/.bin/jest
  printf '#!/bin/sh\nexit 0\n' > node_modules/.bin/eslint; chmod +x node_modules/.bin/eslint
  echo "module.exports={};" > jest.config.js; echo "" > tests/setup.ts
  printf '# Regression suite index\n\n| Test file | Feature | Protects | Issue | Added |\n| --- | --- | --- | --- | --- |\n' > tests/regression/INDEX.md
  echo "node_modules" > .gitignore; echo "src/.keep" > src/.keep
  git add -A >/dev/null; git commit -q -m base
  git init -q --bare -b development "$T/remote-$NAME.git"; git remote add origin "$T/remote-$NAME.git"; git push -q origin development 2>/dev/null
  rm -rf "$T/gh-$NAME"
}
run() { # extra env assignments are passed via the environment of the caller
  ( cd "$R" && PATH="$T/bin:$PATH" FAKE_REMOTE="$T/remote-$NAME.git" FAKE_GH_STATE="$T/gh-$NAME" \
    FAKE_AGENTS=1 PAUSE_SECONDS=0 SKIP_BASELINE=0 MERGE_RETRY_SLEEP=0 WORKTREE_DIR="$T/wt-$NAME" \
    BACKEND_REPO="$BK" BACKEND_BRANCH="${BACKEND_BRANCH:-feat/initial}" bash scripts/overnight/run-all-tasks.sh "$@" ) > "$T/$NAME.out" 2>&1
}
REM() { echo "$T/remote-$NAME.git"; }
rlog() { git --git-dir="$(REM)" log --format=%s development; }          # commit subjects on the fake GitHub's development
rbranches() { git --git-dir="$(REM)" branch --format='%(refname:short)'; }
status_of() { awk -F'\t' -v n="$1" '$1==n{print $2}' "$R/scripts/overnight/.state/status.tsv" 2>/dev/null | tail -1; }
LOCAL_FEATURE_BRANCHES() { git -C "$R" branch --list 'feature/*' | wc -l | tr -d ' '; }

echo "== scenario 1: normal run, review fails once, partial + hold tiers, PR + merge + branch deletion"
NAME=s1; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=review_fail_once run; rc=$?
W="$R/scripts/overnight/.state/work/001"
check "runner exits 0" "[ $rc = 0 ]"
check "issue 1 and 2 done, hold issue 3 skipped" "[ \"\$(status_of 001)\" = done ] && [ \"\$(status_of 002)\" = done ] && [ -z \"\$(status_of 003)\" ]"
check "plan ran on claude, implement on codex" "grep -q 'claude plan plan' $W/fake-calls.txt && grep -q 'codex implement impl-1' $W/fake-calls.txt"
check "review failed once, then a fix round ran on codex and claude reviewed again" "grep -q 'codex implement impl-2' $W/fake-calls.txt && grep -q 'claude review review-2' $W/fake-calls.txt"
check "design spec extracted the screen" "grep -q 'Save your core' $W/design-spec.md"
check "both issues landed on the remote development, in order" "[ \"\$(rlog | grep -c '^Fix #')\" = 2 ] && [ \"\$(rlog | grep -n '^Fix #' | head -1 | grep -c 'Fix #2')\" = 1 ]"
check "each issue went through a merged pull request" "[ -f $T/gh-s1/prs/1.state ] && [ -f $T/gh-s1/prs/2.state ] && grep -q 'Closes #1' $T/gh-s1/prs/1.body"
check "the partial-tier issue's PR also closes it (the agent did not report a partial)" "grep -q 'Closes #2' $T/gh-s1/prs/2.body"
check "PR body ends with the Claude Code line" "tail -1 $T/gh-s1/prs/1.body | grep -q 'Generated with'"
check "commit has both co-authors" "git --git-dir=$(REM) log --grep='^Fix #1' -1 --format=%B development | grep -q 'Codex'"
check "test index row is on development" "git --git-dir=$(REM) show development:tests/regression/INDEX.md | grep -q 'fake/f1.test.ts'"
check "no branches pile up: none on the remote, none local" "[ \"\$(rbranches | tr -d ' ')\" = development ] && [ \"\$(LOCAL_FEATURE_BRANCHES)\" = 0 ]"
check "worktree ends detached, nothing left over" "! git -C $T/wt-s1 symbolic-ref -q HEAD >/dev/null && [ -z \"\$(git -C $T/wt-s1 status --porcelain)\" ]"
check "your own working tree is untouched" "[ \"\$(git -C $R branch --show-current)\" = development ] && [ -z \"\$(git -C $R status --porcelain --untracked-files=no)\" ]"
check "report written" "[ -s $R/scripts/overnight/.state/REPORT.md ]"
check "RED check ran for the listed tests" "[ -f $W/red.txt ]"
check "backend code snapshot exported read-only" "[ -f $R/scripts/overnight/.state/refs/backend/apps/x/urls.py ] && ! touch $R/scripts/overnight/.state/refs/backend/apps/x/new 2>/dev/null"
check "backend routes indexed" "grep -q 'apps/x/urls.py' $R/scripts/overnight/.state/refs/backend-urls.txt"
check "prompts carry the backend branch and the snapshot path" "grep -q 'feat/initial' $W/plan.prompt.md && grep -q '.state/refs/backend' $W/impl-1.prompt.md && grep -q 'Backend alignment' $W/review-1.prompt.md"

echo "== scenario 2: PARTIAL result references the issue and leaves it open; gate failure triggers a fix round"
NAME=s2; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=partial FAKE_BLOCK_NUM=1 run --only 1
check "partial recorded, merged, PR says Refs (not Closes), owner comment posted" "[ \"\$(status_of 001)\" = partial ] && grep -q 'Refs #1' $T/gh-s2/prs/1.body && ! grep -q 'Closes #1' $T/gh-s2/prs/1.body && grep -q 'comment on #1' $T/gh-s2/comments && rlog | grep -q '^Fix #1'"
NAME=s2b; R="$T/repo-s2b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=gate_fail_once run --only 1
check "gate failure triggers a fix round, then done and merged" "[ \"\$(status_of 001)\" = done ] && grep -q 'Gates failed in round 1' $T/s2b.out && rlog | grep -q '^Fix #1'"

echo "== scenario 3: blocked at planning: nothing is merged and no branch is left"
NAME=s3; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=blocked FAKE_BLOCK_NUM=1 run --only 1
check "blocked recorded, nothing on development, no leftover branch" "[ \"\$(status_of 001)\" = blocked ] && ! rlog | grep -q '^Fix #1' && [ \"\$(LOCAL_FEATURE_BRANCHES)\" = 0 ] && [ \"\$(rbranches | tr -d ' ')\" = development ]"

echo "== scenario 4: Claude limited. The review never degrades to Codex (STRICT_REVIEW), other roles may"
NAME=s4; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_LIMIT_CLAUDE=1 LIMIT_WAIT_MINUTES=0 LIMIT_WAIT_MAX_HOURS=0 run --only 1; rc=$?
check "plan/implement use the fallback, but the review waits: exit 75, nothing merged" "[ $rc = 75 ] && grep -q 'DEGRADED' $T/s4.out && ! rlog | grep -q '^Fix #1' && [ \"\$(status_of 001)\" = pending ]"
NAME=s4c; R="$T/repo-s4c"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_LIMIT_CLAUDE=1 STRICT_REVIEW=0 run --only 1
check "with STRICT_REVIEW=0 the fallback completes the issue (degraded)" "[ \"\$(status_of 001)\" = done ] && grep -q 'DEGRADED' $T/s4c.out && rlog | grep -q '^Fix #1'"
NAME=s4b; R="$T/repo-s4b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=reviewer_edits run --only 1
check "reviewer tampering is detected and restored (never merged)" "grep -q 'reviewer modified the tree' $T/s4b.out && ! git --git-dir=$(REM) show development:src/fake-1.ts 2>/dev/null | grep -q tampered"

echo "== scenario 5: both providers limited -> exit 75, issue stays pending"
NAME=s5; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_LIMIT_CLAUDE=1 FAKE_LIMIT_CODEX=1 LIMIT_WAIT_MINUTES=0 LIMIT_WAIT_MAX_HOURS=0 run --only 1; rc=$?
check "exit code 75 and issue left pending" "[ $rc = 75 ] && [ \"\$(status_of 001)\" = pending ]"

echo "== scenario 6: dry run; unreachable target branch is refused at pre-flight"
NAME=s6; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
run --dry-run; check "dry run lists issues without running agents or creating a worktree" "grep -q 'Would work on' $T/s6.out && [ ! -d $T/wt-s6 ]"
TARGET_BRANCH=nope run; rc=$?
check "missing target branch is refused" "[ $rc != 0 ] && grep -q 'PRE-FLIGHT FAILED' $T/s6.out"

echo "== scenario 7: polish pass applies MINOR fixes, and is reverted when it breaks the gates"
NAME=s7; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=minor_findings run --only 1
check "polish pass ran and was applied and merged" "grep -q 'impl-1-polish' $R/scripts/overnight/.state/work/001/fake-calls.txt && grep -q 'POLISH applied' $T/s7.out && [ \"\$(status_of 001)\" = done ] && rlog | grep -q '^Fix #1'"
NAME=s7b; R="$T/repo-s7b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=polish_breaks run --only 1
check "a polish pass that breaks the gates is reverted, issue still done" "grep -q 'POLISH reverted' $T/s7b.out && [ \"\$(status_of 001)\" = done ] && ! git --git-dir=$(REM) show development:src/fake-1.ts | grep -q BROKEN"
NAME=s7c; R="$T/repo-s7c"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=minor_findings POLISH_MINOR=0 run --only 1
check "POLISH_MINOR=0 skips the polish pass" "! grep -q 'impl-1-polish' $R/scripts/overnight/.state/work/001/fake-calls.txt"

echo "== scenario 8: backend alignment is enforced"
NAME=s8; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
BACKEND_BRANCH=nope run --only 1; rc=$?
check "missing backend branch is refused at pre-flight" "[ $rc != 0 ] && grep -q \"backend branch 'nope' not found\" $T/s8.out"
NAME=s8b; R="$T/repo-s8b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=no_backend_section run --only 1
check "a plan without a Backend alignment section is rejected" "grep -q 'no .## Backend alignment. section' $T/s8b.out && ! rlog | grep -q '^Fix #1'"

echo "== scenario 9: a partial TEST_EXEMPT line does not switch the RED check off"
NAME=s9; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=partial_exempt run --only 1
check "RED check still ran and the issue completed" "[ -f $R/scripts/overnight/.state/work/001/red.txt ] && [ \"\$(status_of 001)\" = done ]"

echo "== scenario 10: development moves while an issue is built"
NAME=s10; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=dev_moves run --only 1
check "non-conflicting change: rebased, gates re-run, merged on top of the other commit" "grep -q 'moved while #1 was built' $T/s10.out && [ \"\$(status_of 001)\" = done ] && rlog | grep -q '^someone else' && rlog | grep -q '^Fix #1'"
NAME=s10b; R="$T/repo-s10b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=dev_conflict MAX_ATTEMPTS=1 run --only 1
check "conflicting change: the issue fails cleanly, nothing merged, no branch left behind" "[ \"\$(status_of 001)\" = failed ] && grep -q 'conflicts with development' $R/scripts/overnight/.state/status.tsv && ! rlog | grep -q '^Fix #1' && [ \"\$(LOCAL_FEATURE_BRANCHES)\" = 0 ] && [ \"\$(rbranches | tr -d ' ')\" = development ]"
NAME=s10c; R="$T/repo-s10c"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=dev_conflict MAX_ATTEMPTS=2 run --only 1
check "with a second attempt the issue is rebuilt on the new development and merges" "[ \"\$(status_of 001)\" = done ] && rlog | grep -q '^someone else' && rlog | grep -q '^Fix #1'"

echo "== scenario 11: the merge fails -> the runner stops, the verified commit stays reachable"
NAME=s11; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_MERGE_FAIL=1 MERGE_TRIES=2 run; rc=$?
check "exit 76, PR left open, branch kept, nothing merged, second issue not started" "[ $rc = 76 ] && [ \"\$(status_of 001)\" = failed ] && [ -z \"\$(status_of 002)\" ] && [ -f $T/gh-s11/prs/1.head ] && [ ! -f $T/gh-s11/prs/1.state ] && [ \"\$(LOCAL_FEATURE_BRANCHES)\" = 1 ] && ! rlog | grep -q '^Fix #1'"

echo "== scenario 12: circuit breaker after consecutive failed issues"
NAME=s12; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=review_always_fail MAX_ATTEMPTS=1 MAX_ROUNDS=2 MAX_CONSECUTIVE_FAILED=2 run; rc=$?
check "stops with exit 77 after two failed issues in a row" "[ $rc = 77 ] && [ \"\$(status_of 001)\" = failed ] && [ \"\$(status_of 002)\" = failed ] && [ \"\$(LOCAL_FEATURE_BRANCHES)\" = 0 ]"

echo; echo "passed: $PASS   failed: $FAIL"; [ "$FAIL" = 0 ]
