#!/usr/bin/env bash
# End-to-end self-test of the runner with fake agents in a throwaway git repo. No tokens are spent.
#   bash scripts/overnight/selftest/run-selftest.sh
set -u
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
T="$(mktemp -d)"; trap '[ "${KEEP:-0}" = 1 ] || { chmod -R u+w "$T" 2>/dev/null; rm -rf "$T"; }' EXIT; [ "${KEEP:-0}" = 1 ] && echo "keeping $T"
PASS=0; FAIL=0
BK="$T/backend"; mkdir -p "$BK/docs" "$BK/apps/x"
( cd "$BK" && git init -q -b feat/initial . && git config user.email t@t && git config user.name t \
  && echo api > docs/API_REFERENCE.md && echo mvp > docs/mvp.md && printf 'urlpatterns = [path("x/", view)]\n' > apps/x/urls.py \
  && git add -A && git commit -q -m "fake backend" )
ok() { echo "  ok   - $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL - $1"; FAIL=$((FAIL+1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1  [$2]"; fi; }

new_repo() { # dir
  local R="$1"; mkdir -p "$R" && cd "$R" && git init -q -b development .
  git config user.email t@t; git config user.name t
  mkdir -p scripts tests/regression/foundation src node_modules/.bin "Coreo Design System Rebuild" "../docs-$$"
  cp -R "$SRC/scripts/overnight" scripts/overnight; rm -rf scripts/overnight/.state scripts/overnight/issues/*
  cat > scripts/overnight/queue.tsv <<'Q'
1	run	first
2	partial	second
3	hold	held back
Q
  for n in 1 2 3; do printf '# 00%s - Fake issue %s\n\n| Field | Value |\n| --- | --- |\n| Screens | 8a |\n\n## Summary\nx\n' "$n" "$n" > "scripts/overnight/issues/00$n-fake-issue-$n.md"; done
  printf '<div data-screen-label="8a Save your core">Hello</div>\n' > "Coreo Design System Rebuild/Coreo App Screens.dc.html"
  echo "api" > "../docs-$$/API_REFERENCE.md"; echo "mvp" > "../docs-$$/mvp.md"
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
}
run() { # extra env assignments are passed via the environment of the caller
  ( cd "$R" && FAKE_AGENTS=1 GH_COMMENT=0 PAUSE_SECONDS=0 SKIP_BASELINE=0 WORKTREE_DIR="$T/wt-$NAME" BACKEND_REPO="$BK" BACKEND_BRANCH="${BACKEND_BRANCH:-feat/initial}" bash scripts/overnight/run-all-tasks.sh "$@" ) > "$T/$NAME.out" 2>&1
}

echo "== scenario 1: normal run, review fails once, gate fails once, partial + hold tiers"
NAME=s1; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=review_fail_once run; rc=$?
STAT="$R/scripts/overnight/.state/status.tsv"
check "runner exits 0" "[ $rc = 0 ]"
check "issue 1 is done" "grep -q '^001	done' $STAT"
check "issue 2 (partial tier, no partial flag from agent) is done" "grep -q '^002	done' $STAT"
check "hold issue 3 is skipped by default" "! grep -q '^003' $STAT"
W="$R/scripts/overnight/.state/work/001"
check "plan ran on claude" "grep -q 'claude plan plan' $W/fake-calls.txt"
check "implement ran on codex" "grep -q 'codex implement impl-1' $W/fake-calls.txt"
check "review failed once then a fix round ran on codex" "grep -q 'codex implement impl-2' $W/fake-calls.txt && grep -q 'claude review review-2' $W/fake-calls.txt"
check "plan.md exists" "[ -s $W/plan.md ]"
check "design spec extracted the screen" "grep -q 'Save your core' $W/design-spec.md"
check "merge commit on the integration branch" "git -C $T/wt-s1 log --oneline chore/overnight-runner | grep -q 'Merge #1'"
check "feature commit message has both co-authors" "git -C $T/wt-s1 log -1 --format=%B chore/overnight-runner^2 | grep -q 'Codex'"
check "test index row added for the new test" "grep -q 'fake/f1.test.ts' $T/wt-s1/tests/regression/INDEX.md"
check "main working tree untouched (still on development, clean)" "[ \"\$(git -C $R branch --show-current)\" = development ] && [ -z \"\$(git -C $R status --porcelain --untracked-files=no)\" ]"
check "nothing pushed (no remotes)" "[ -z \"\$(git -C $R remote)\" ]"
check "report written" "[ -s $R/scripts/overnight/.state/REPORT.md ]"
check "backend code snapshot exported read-only" "[ -f $R/scripts/overnight/.state/refs/backend/apps/x/urls.py ] && ! touch $R/scripts/overnight/.state/refs/backend/apps/x/new 2>/dev/null"
check "backend routes indexed" "grep -q 'apps/x/urls.py' $R/scripts/overnight/.state/refs/backend-urls.txt"
check "prompts carry the backend branch and the snapshot path" "grep -q 'feat/initial' $W/plan.prompt.md && grep -q '.state/refs/backend' $W/impl-1.prompt.md && grep -q 'Backend alignment' $W/review-1.prompt.md"

echo "== scenario 2: gate fails once (runner-run gates catch it) and PARTIAL result"
NAME=s2; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=partial FAKE_BLOCK_NUM=1 run --only 1; rc=$?
check "partial recorded" "grep -q '^001	partial' $R/scripts/overnight/.state/status.tsv"
NAME=s2b; R="$T/repo-s2b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=gate_fail_once run --only 1
check "gate failure triggers a fix round, then done" "grep -q '^001	done' $R/scripts/overnight/.state/status.tsv && grep -q 'Gates failed in round 1' $T/s2b.out"

echo "== scenario 3: blocked at planning"
NAME=s3; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=blocked FAKE_BLOCK_NUM=1 run --only 1
check "blocked recorded, nothing merged" "grep -q '^001	blocked' $R/scripts/overnight/.state/status.tsv && ! git -C $T/wt-s3 log --oneline chore/overnight-runner | grep -q 'Merge #1'"

echo "== scenario 4: Claude usage limit -> Codex takes over (degraded), and reviewer edits are undone"
NAME=s4; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_LIMIT_CLAUDE=1 run --only 1; rc=$?
check "completes using the fallback provider" "grep -q '^001	done' $R/scripts/overnight/.state/status.tsv && grep -q 'DEGRADED' $T/s4.out"
NAME=s4b; R="$T/repo-s4b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=reviewer_edits run --only 1
check "reviewer tampering is detected and restored" "grep -q 'reviewer modified the tree' $T/s4b.out && ! grep -q tampered $T/wt-s4b/src/fake-1.ts"

echo "== scenario 5: both providers limited -> exit 75, issue stays pending"
NAME=s5; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_LIMIT_CLAUDE=1 FAKE_LIMIT_CODEX=1 LIMIT_WAIT_MINUTES=0 LIMIT_WAIT_MAX_HOURS=0 run --only 1; rc=$?
check "exit code 75" "[ $rc = 75 ]"
check "issue left pending, not failed" "grep -q '^001	pending' $R/scripts/overnight/.state/status.tsv"

echo "== scenario 6: dry run and refusing a dirty tree"
NAME=s6; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
run --dry-run; check "dry run lists issues without running agents" "grep -q 'Would work on' $T/s6.out && [ ! -d $T/wt-s6 ]"
echo "x" >> package.json; run; rc=$?
check "dirty tracked file is refused" "[ $rc != 0 ] && grep -q 'PRE-FLIGHT FAILED' $T/s6.out"

echo "== scenario 7: polish pass applies MINOR fixes, and is reverted when it breaks the gates"
NAME=s7; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=minor_findings run --only 1
check "polish pass ran and was applied" "grep -q 'impl-1-polish' $R/scripts/overnight/.state/work/001/fake-calls.txt && grep -q 'POLISH applied' $T/s7.out && grep -q '^001	done' $R/scripts/overnight/.state/status.tsv"
NAME=s7b; R="$T/repo-s7b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=polish_breaks run --only 1
check "a polish pass that breaks the gates is reverted, issue still done" "grep -q 'POLISH reverted' $T/s7b.out && grep -q '^001	done' $R/scripts/overnight/.state/status.tsv && ! grep -q BROKEN $T/wt-s7b/src/fake-1.ts"
NAME=s7c; R="$T/repo-s7c"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=minor_findings POLISH_MINOR=0 run --only 1
check "POLISH_MINOR=0 skips the polish pass" "! grep -q 'impl-1-polish' $R/scripts/overnight/.state/work/001/fake-calls.txt"

echo "== scenario 8: backend alignment is enforced"
NAME=s8; R="$T/repo-$NAME"; new_repo "$R" 2>/dev/null; cd "$R"
BACKEND_BRANCH=nope run --only 1; rc=$?
check "missing backend branch is refused at pre-flight" "[ $rc != 0 ] && grep -q \"backend branch 'nope' not found\" $T/s8.out"
NAME=s8b; R="$T/repo-s8b"; new_repo "$R" 2>/dev/null; cd "$R"
FAKE_SCENARIO=no_backend_section run --only 1
check "a plan without a Backend alignment section is rejected" "grep -q 'no .## Backend alignment. section' $T/s8b.out && ! grep -q '^001	done' $R/scripts/overnight/.state/status.tsv"

echo; echo "passed: $PASS   failed: $FAIL"; [ "$FAIL" = 0 ]
