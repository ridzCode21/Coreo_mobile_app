#!/usr/bin/env bash
# Overnight runner: fixes the open design-gap issues one by one with BOTH Claude Code and Codex CLI.
#
#   bash scripts/overnight/run-all-tasks.sh                 # run everything runnable until done / limits
#   bash scripts/overnight/run-all-tasks.sh --status        # progress table
#   bash scripts/overnight/run-all-tasks.sh --dry-run       # show the plan and the next issue, no agents
#   bash scripts/overnight/run-all-tasks.sh --only 35       # one issue
#   bash scripts/overnight/run-all-tasks.sh --max-issues 3  # stop after 3 issues
#   bash scripts/overnight/run-all-tasks.sh --include-hold  # also try the held-back issues (as partial)
#   bash scripts/overnight/run-all-tasks.sh --retry-blocked # give blocked/failed issues another go
#   bash scripts/overnight/run-all-tasks.sh --sync          # refresh issue files from GitHub, then exit
#   bash scripts/overnight/run-all-tasks.sh --report        # write the morning report (REPORT.md), then exit
#   bash scripts/overnight/run-all-tasks.sh --stop          # finish the current issue, then stop
#   bash scripts/overnight/run-all-tasks.sh --stop-now      # stop immediately (the issue resumes later)
#
# Per issue (every agent call is a FRESH session):
#   1 PLAN + RED TESTS  Claude  reads the design, writes plan.md and the failing tests (TDD red)
#   2 IMPLEMENT         Codex   makes the tests pass, to the design (TDD green + refactor)
#   3 GATES             runner  typecheck + lint + format + all tests (never trusts an agent's word)
#   4 REVIEW            Claude  strict, independent review + design alignment, VERDICT: PASS|FAIL
#   5 FIX               Codex   fixes the findings; steps 3-5 repeat (a ralph-style loop) up to MAX_ROUNDS
#   5b POLISH           Codex   one pass for MINOR findings after a PASS (reverted if any gate breaks; POLISH_MINOR=0 to skip)
#   6 FINALIZE          runner  gates again, scope check, regression INDEX, commit, local merge, GitHub comment
# If one provider hits its usage limit the other takes over; if both are limited the runner waits and retries.
# Nothing is ever pushed. Works with macOS bash 3.2. Progress truth = status.tsv + git, safe to stop/restart.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SELF="$ROOT/scripts/overnight/run-all-tasks.sh"
OVN="$ROOT/scripts/overnight"
STATE="$OVN/.state"
WORK_ROOT="$STATE/work"
LOGS="$STATE/logs"
REFS="$STATE/refs"
STATUS="$STATE/status.tsv"
RUNNER_LOG="$STATE/runner.log"
LOCK="$STATE/lock"
STOPF="$STATE/STOP"
ISSUES_DIR="$OVN/issues"
QUEUE="$OVN/queue.tsv"
PROMPTS="$OVN/prompts"

# ---- settings (override with environment variables) ----
REPO_SLUG="${REPO_SLUG:-ridzCode21/Coreo_mobile_app}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CODEX_BIN="${CODEX_BIN:-codex}"
CLAUDE_MODEL="${CLAUDE_MODEL:-}"              # empty = your Claude Code default
CLAUDE_EFFORT="${CLAUDE_EFFORT:-}"            # e.g. high
CODEX_MODEL="${CODEX_MODEL:-}"                # empty = your ~/.codex/config.toml default
BUDGET_USD="${BUDGET_USD:-10}"                # spend cap per Claude session in USD (0 = no cap). A session that hits it fails and is retried
MAX_ATTEMPTS="${MAX_ATTEMPTS:-2}"             # whole-pipeline attempts per issue
MAX_ROUNDS="${MAX_ROUNDS:-4}"                 # implement/fix + review rounds per attempt
ALLOW_FALLBACK="${ALLOW_FALLBACK:-1}"         # 1 = the other provider takes over when one is limited
LIMIT_WAIT_MINUTES="${LIMIT_WAIT_MINUTES:-30}"   # sleep between retries when BOTH providers are limited
LIMIT_WAIT_MAX_HOURS="${LIMIT_WAIT_MAX_HOURS:-7}" # give up (exit 75) after waiting this long in total
TRANSIENT_RETRIES="${TRANSIENT_RETRIES:-3}"
PAUSE_SECONDS="${PAUSE_SECONDS:-5}"
POLISH_MINOR="${POLISH_MINOR:-1}"             # 1 = one extra fix pass for MINOR review findings (reverted if the gates break)
GH_COMMENT="${GH_COMMENT:-1}"                 # 1 = comment on the GitHub issue after each issue (never closes it)
BASE_BRANCH="${BASE_BRANCH:-}"                # branch the integration branch starts from (default: current branch)
INTEG_BRANCH="${INTEG_BRANCH:-chore/overnight-runner}"
WORKTREE_DIR="${WORKTREE_DIR:-$(dirname "$ROOT")/$(basename "$ROOT")-overnight}"
DESIGN_DIR_NAME="${DESIGN_DIR_NAME:-Coreo Design System Rebuild}"
DESIGN_SRC="${DESIGN_SRC:-$ROOT/$DESIGN_DIR_NAME}"
BACKEND_REPO="${BACKEND_REPO:-$(dirname "$ROOT")/django_app/django_app}"   # the Django backend git repo (read only)
BACKEND_BRANCH="${BACKEND_BRANCH:-feat/initial}"                           # branch every frontend issue must align with
SKIP_BASELINE="${SKIP_BASELINE:-0}"
FAKE_AGENTS="${FAKE_AGENTS:-0}"               # self-test only
COMMIT_TRAILER1="Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
COMMIT_TRAILER2="Co-Authored-By: Codex <noreply@openai.com>"

CLAUDE_ALLOWED="${CLAUDE_ALLOWED:-Bash(npm *),Bash(npx *),Bash(node *),Bash(git status*),Bash(git diff*),Bash(git log*),Bash(git show*),Bash(git ls-files*),Bash(git branch*),Bash(git rev-parse*),Bash(ls *),Bash(cat *),Bash(grep *),Bash(rg *),Bash(find *),Bash(sed *),Bash(awk *),Bash(python3 *),Bash(echo *),Bash(printf *),Bash(head *),Bash(tail *),Bash(wc *),Bash(sort *),Bash(diff *),Bash(mkdir *),Bash(mv *),Bash(cp *),Bash(touch *),Bash(pwd),Bash(cd *),Bash(test *),Bash(date *),Bash(which *),Bash(true),Bash(false)}"
CLAUDE_DENIED="${CLAUDE_DENIED:-Bash(git push*),Bash(git commit*),Bash(git reset*),Bash(git clean*),Bash(git checkout*),Bash(git stash*),Bash(git merge*),Bash(git rebase*),Bash(git worktree*),Bash(git config*),Bash(gh *),Bash(rm -rf*),Bash(rm -r *),Bash(sudo *),Bash(npm publish*),Bash(npm install -g*),Bash(npm uninstall*),Bash(npm install*),Bash(npm i *),Bash(npx expo prebuild*),Bash(npx eas*),Bash(eas *),Bash(curl *),Bash(wget *),Bash(chmod *)}"

# ---- helpers ----
ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { mkdir -p "$STATE"; echo "[$(ts)] $*" | tee -a "$RUNNER_LOG"; }
num3() { printf '%03d' "$((10#$1))"; }
issue_file() { ls "$ISSUES_DIR"/"$(num3 "$1")"-*.md 2>/dev/null | head -1; }
title_of() { head -1 "$1" | sed -E 's/^# [0-9]+ - //'; }
slug_of() { echo "$1" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40 | sed -E 's/-+$//'; }

queue_rows() { grep -v '^[[:space:]]*#' "$QUEUE" | grep -v '^[[:space:]]*$'; }
tier_of() { queue_rows | awk -F'\t' -v n="$1" '$1==n{print $2}' | head -1; }

status_get()   { [ -f "$STATUS" ] && awk -F'\t' -v n="$(num3 "$1")" '$1==n{print $2}' "$STATUS" | tail -1; }
attempts_get() { local a=""; [ -f "$STATUS" ] && a="$(awk -F'\t' -v n="$(num3 "$1")" '$1==n{print $3}' "$STATUS" | tail -1)"; echo "${a:-0}"; }
col_get()      { [ -f "$STATUS" ] && awk -F'\t' -v n="$(num3 "$1")" -v c="$2" '$1==n{print $c}' "$STATUS" | tail -1; }
status_set() { # num status attempts note [branch] [commit]
  local n; n="$(num3 "$1")"; mkdir -p "$STATE"; touch "$STATUS"
  local br="${5:-$(col_get "$1" 6)}" cm="${6:-$(col_get "$1" 7)}" tmp="$STATUS.tmp"
  awk -F'\t' -v n="$n" '$1!=n' "$STATUS" > "$tmp"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$n" "$2" "$3" "$(ts)" "$(echo "${4:-}" | tr '\t\n' '  ' | cut -c1-300)" "$br" "$cm" >> "$tmp"
  sort "$tmp" > "$STATUS"; rm -f "$tmp"
}

show_status() {
  printf '%-5s %-9s %-4s %-6s %s\n' NUM STATE TRY TIER TITLE
  local n f t st
  for n in $(queue_rows | cut -f1); do
    f="$(issue_file "$n")"; [ -z "$f" ] && continue
    st="$(status_get "$n")"; t="$(tier_of "$n")"
    printf '%-5s %-9s %-4s %-6s %s\n' "$n" "${st:-pending}" "$(attempts_get "$n")" "$t" "$(title_of "$f" | cut -c1-70)"
  done
  echo
  if [ -d "$LOCK" ]; then echo "Runner: RUNNING (pid $(cat "$LOCK/pid" 2>/dev/null))"; else echo "Runner: not running"; fi
  [ -f "$RUNNER_LOG" ] && { echo; echo "Last log lines:"; tail -6 "$RUNNER_LOG"; }
}

# ---- argument parsing ----
ORIG_ARGS=("$@")
ONLY=""; MAX_ISSUES=0; DRY_RUN=0; RETRY_BLOCKED=0; INCLUDE_HOLD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --status) show_status; exit 0 ;;
    --stop) mkdir -p "$STATE"; touch "$STOPF"; echo "Stop requested: the runner stops after the current issue."; exit 0 ;;
    --stop-now)
      if [ -f "$LOCK/pid" ]; then p="$(cat "$LOCK/pid")"; touch "$STOPF"; kill -TERM "$p" 2>/dev/null && echo "Sent stop signal to runner (pid $p)." || echo "Runner not running."
      else echo "Runner not running."; fi
      exit 0 ;;
    --sync) mkdir -p "$ISSUES_DIR"; python3 -I "$OVN/lib/sync_issues.py" "$REPO_SLUG" "$ISSUES_DIR"; exit $? ;;
    --report) mkdir -p "$STATE"; python3 -I "$OVN/lib/records.py" report "$STATE" "$STATE/REPORT.md" && cat "$STATE/REPORT.md"; exit 0 ;;
    --only) ONLY="$((10#$2))"; shift ;;
    --max-issues) MAX_ISSUES="$2"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    --include-hold) INCLUDE_HOLD=1 ;;
    --retry-blocked) RETRY_BLOCKED=1 ;;
    -h|--help) sed -n '2,24p' "$SELF"; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 2 ;;
  esac
  shift
done

mkdir -p "$STATE" "$WORK_ROOT" "$LOGS" "$REFS"

# ---- the plan for this run (shared by --dry-run and the real run) ----
runnable_list() { # prints "num<TAB>tier" in order for issues this run may work on
  local n t st
  queue_rows | while IFS="$(printf '\t')" read -r n t _rest; do
    [ -n "$ONLY" ] && [ "$n" != "$ONLY" ] && continue
    [ -z "$(issue_file "$n")" ] && continue
    st="$(status_get "$n")"
    case "$st" in
      done|partial) continue ;;
      blocked|failed) [ "$RETRY_BLOCKED" = 1 ] || continue ;;
    esac
    if [ "$t" = hold ] && [ "$INCLUDE_HOLD" = 0 ] && [ -z "$ONLY" ]; then continue; fi
    printf '%s\t%s\n' "$n" "$t"
  done
}

if [ "$DRY_RUN" = 1 ]; then
  echo "DRY RUN. Repo: $REPO_SLUG   integration branch: $INTEG_BRANCH   worktree: $WORKTREE_DIR"
  echo "Providers: plan/review = claude (fallback codex), implement/fix = codex (fallback claude). Rounds per attempt: $MAX_ROUNDS, attempts: $MAX_ATTEMPTS"
  echo; echo "Would work on, in this order:"
  runnable_list | while IFS="$(printf '\t')" read -r n t; do printf '  #%-3s %-8s %s\n' "$n" "$t" "$(title_of "$(issue_file "$n")" | cut -c1-70)"; done
  first="$(runnable_list | head -1 | cut -f1)"
  if [ -n "$first" ]; then
    echo; echo "--- first prompt preview (role: plan) for #$first:"
    mkdir -p "$STATE/dry"
    python3 -I "$OVN/lib/render.py" "$PROMPTS/01-plan-and-red-tests.md" "$PROMPTS/common.md" "$STATE/dry/plan.md" \
      WT="$WORKTREE_DIR" BRANCH="feature/$(num3 "$first")-<slug>" NUM="$first" TITLE="$(title_of "$(issue_file "$first")")" \
      ISSUE_FILE="$(issue_file "$first")" WORK="$WORK_ROOT/$(num3 "$first")" DESIGN_FILE="$DESIGN_SRC/Coreo App Screens.dc.html" \
      REFS="$REFS" BACKEND_DIR="$REFS/backend" BACKEND_BRANCH="$BACKEND_BRANCH" BACKEND_SHA="(snapshot taken at start)" TODAY="$(date +%Y-%m-%d)" ROUND=1 MAX_ROUNDS="$MAX_ROUNDS" TIER="$(tier_of "$first")" TIER_NOTE="" INTEG_BRANCH="$INTEG_BRANCH" STATE="$STATE"
    head -22 "$STATE/dry/plan.md"
  else
    echo "Nothing runnable."
  fi
  exit 0
fi

# ---- pre-flight ----
fail_pre() { echo "PRE-FLIGHT FAILED: $*" >&2; exit 1; }
cd "$ROOT" || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || fail_pre "not a git repository"
if [ "$FAKE_AGENTS" != 1 ]; then
  command -v "$CLAUDE_BIN" >/dev/null 2>&1 || fail_pre "Claude CLI not found ('$CLAUDE_BIN')"
  command -v "$CODEX_BIN" >/dev/null 2>&1 || log "WARNING: Codex CLI not found: Claude will do every role (no usage sharing)."
fi
[ -f "$QUEUE" ] || fail_pre "missing $QUEUE"
[ -n "$(ls "$ISSUES_DIR"/*.md 2>/dev/null)" ] || fail_pre "no issue files; run: bash scripts/overnight/run-all-tasks.sh --sync"
[ -f "$DESIGN_SRC/Coreo App Screens.dc.html" ] || fail_pre "design file not found: $DESIGN_SRC/Coreo App Screens.dc.html"
git -C "$BACKEND_REPO" rev-parse --verify "$BACKEND_BRANCH^{commit}" >/dev/null 2>&1 || fail_pre "backend branch '$BACKEND_BRANCH' not found in $BACKEND_REPO (set BACKEND_REPO / BACKEND_BRANCH)"
for f in scripts/overnight/run-all-tasks.sh jest.config.js tests/setup.ts; do
  git ls-files --error-unmatch "$f" >/dev/null 2>&1 || fail_pre "$f is not committed. Commit the setup first (README: scripts/overnight/README.md, 'Before the first run')."
done
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  fail_pre "uncommitted changes to tracked files in $ROOT. The worktree starts from the last commit, so commit or stash them first."
fi
BASE_BRANCH="${BASE_BRANCH:-$(git branch --show-current)}"
[ -n "$BASE_BRANCH" ] || fail_pre "detached HEAD; check out a branch or set BASE_BRANCH"

# ---- single-instance lock ----
if ! mkdir "$LOCK" 2>/dev/null; then
  oldpid="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then echo "Runner already running (pid $oldpid). Use --status, --stop or --stop-now."; exit 1; fi
  log "Removing stale lock (pid ${oldpid:-?} is gone)."; rm -rf "$LOCK"; mkdir "$LOCK"
fi
echo $$ > "$LOCK/pid"
CURRENT_NUM=""
cleanup() {
  if [ -n "$CURRENT_NUM" ] && [ "$(status_get "$CURRENT_NUM")" = "running" ]; then
    status_set "$CURRENT_NUM" pending "$(attempts_get "$CURRENT_NUM")" "interrupted; will resume"
  fi
  rm -rf "$LOCK"
}
trap cleanup EXIT
trap 'log "Interrupted. Re-run to continue where it stopped."; exit 130' INT TERM

# keep the Mac awake during the run (re-exec under caffeinate once)
if [ -z "${RUNNER_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  rm -rf "$LOCK"; trap - EXIT
  RUNNER_CAFFEINATED=1 exec caffeinate -i bash "$SELF" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
fi

# ---- worktree (isolated checkout: your own working tree is never touched) ----
GIT_COMMON="$(git rev-parse --git-common-dir)"
EXCLUDE_FILE="$GIT_COMMON/info/exclude"
mkdir -p "$(dirname "$EXCLUDE_FILE")"; touch "$EXCLUDE_FILE"
for pat in "$DESIGN_DIR_NAME/" ".claude/ralph-loop.local.md" "scripts/overnight/.state/"; do
  grep -qxF "$pat" "$EXCLUDE_FILE" || echo "$pat" >> "$EXCLUDE_FILE"
done

WT="$WORKTREE_DIR"
if [ ! -e "$WT/.git" ]; then
  log "Creating worktree $WT on branch $INTEG_BRANCH (from $BASE_BRANCH)."
  if git show-ref --verify --quiet "refs/heads/$INTEG_BRANCH"; then git worktree add "$WT" "$INTEG_BRANCH" >/dev/null 2>&1 || fail_pre "git worktree add failed"
  else git worktree add -b "$INTEG_BRANCH" "$WT" "$BASE_BRANCH" >/dev/null 2>&1 || fail_pre "git worktree add failed"; fi
fi
# Agents read the design and the backend docs from read-only snapshots inside the state folder (which they are
# allowed to read); the real design folder is never exposed to them.
mkdir -p "$REFS/design"
for f in "Coreo App Screens.dc.html" "Coreo Brand Book.dc.html"; do
  [ -f "$DESIGN_SRC/$f" ] && { cp -f "$DESIGN_SRC/$f" "$REFS/design/$f" && chmod a-w "$REFS/design/$f"; }
done
DESIGN_FILE="$REFS/design/Coreo App Screens.dc.html"
BACKEND_DIR="$REFS/backend"; BACKEND_SHA=""

# Read-only snapshot of the backend CODE and docs, exported straight from git (the backend working tree is never
# touched, whatever branch it is on). Refreshed whenever the branch moves. Docs for the prompts come from here too,
# so the docs and the code the agents read always belong to the same commit.
snapshot_backend() {
  local sha parts p
  sha="$(git -C "$BACKEND_REPO" rev-parse --verify "$BACKEND_BRANCH^{commit}" 2>/dev/null)" || { log "WARNING: backend branch $BACKEND_BRANCH not found; keeping the last snapshot."; return 0; }
  if [ "$sha" = "$(cat "$REFS/backend.sha" 2>/dev/null)" ] && [ -d "$BACKEND_DIR" ]; then BACKEND_SHA="$sha"; return 0; fi
  [ -d "$BACKEND_DIR" ] && { chmod -R u+w "$BACKEND_DIR" 2>/dev/null; rm -rf "$BACKEND_DIR"; }
  mkdir -p "$BACKEND_DIR"
  parts=""
  for p in apps med_app docs requirements.txt manage.py pyproject.toml TODOS.md; do
    git -C "$BACKEND_REPO" cat-file -e "$sha:$p" 2>/dev/null && parts="$parts $p"
  done
  # shellcheck disable=SC2086
  git -C "$BACKEND_REPO" archive "$sha" -- $parts | tar -x -C "$BACKEND_DIR"
  ( cd "$BACKEND_DIR" && grep -rn -E "path\(|re_path\(|\.register\(" --include=urls.py . | sed 's#^\./##' > "$REFS/backend-urls.txt" )
  [ -f "$BACKEND_DIR/docs/API_REFERENCE.md" ] && { cp -f "$BACKEND_DIR/docs/API_REFERENCE.md" "$REFS/API_REFERENCE.md.tmp" && mv -f "$REFS/API_REFERENCE.md.tmp" "$REFS/API_REFERENCE.md"; }
  [ -f "$BACKEND_DIR/docs/mvp.md" ] && { cp -f "$BACKEND_DIR/docs/mvp.md" "$REFS/mvp.md.tmp" && mv -f "$REFS/mvp.md.tmp" "$REFS/mvp.md"; }
  chmod a-w "$REFS/API_REFERENCE.md" "$REFS/mvp.md" "$REFS/backend-urls.txt" 2>/dev/null
  chmod -R a-w "$BACKEND_DIR"
  echo "$sha" > "$REFS/backend.sha"
  BACKEND_SHA="$sha"
  log "Backend snapshot: $BACKEND_BRANCH @ ${sha:0:9} ($(git -C "$BACKEND_REPO" log -1 --format=%s "$sha" | cut -c1-70)) -> $BACKEND_DIR"
}
rm -f "$REFS/API_REFERENCE.md" "$REFS/mvp.md" 2>/dev/null
snapshot_backend

[ "$FAKE_AGENTS" = 1 ] && [ ! -e "$WT/node_modules" ] && ln -s "$ROOT/node_modules" "$WT/node_modules"   # self-test only: stub binaries
wt() { ( cd "$WT" && "$@" ); }
if [ "$FAKE_AGENTS" != 1 ]; then
  lockhash="$(shasum "$WT/package-lock.json" | cut -d' ' -f1)"
  if [ ! -d "$WT/node_modules" ] || [ "$(cat "$STATE/npm-ci.stamp" 2>/dev/null)" != "$lockhash" ]; then
    log "Installing dependencies in the worktree (npm ci)..."
    ( cd "$WT" && NODE_ENV=development npm ci --include=dev >"$LOGS/npm-ci.log" 2>&1 ) || fail_pre "npm ci failed, see $LOGS/npm-ci.log"
    echo "$lockhash" > "$STATE/npm-ci.stamp"
  fi
fi

# ---- gates (the runner runs these itself: it never trusts an agent's "all green") ----
run_gates() { # outfile -> 0 if every gate passes
  local out="$1" ok=0 name cmd
  : > "$out"
  for name in typecheck lint format:check; do
    echo "### npm run $name" >> "$out"
    if ( cd "$WT" && CI=1 npm run "$name" >> "$out" 2>&1 ); then echo "=> PASS $name" >> "$out"; else echo "=> FAIL $name" >> "$out"; ok=1; fi
  done
  echo "### npx eslint . --max-warnings 0   (npm run lint skips tests/ and ignores warnings)" >> "$out"
  if ( cd "$WT" && CI=1 npx eslint . --max-warnings 0 >> "$out" 2>&1 ); then echo "=> PASS eslint-strict" >> "$out"; else echo "=> FAIL eslint-strict" >> "$out"; ok=1; fi
  echo "### npm test" >> "$out"
  if ( cd "$WT" && CI=1 npm test -- --ci --forceExit >> "$out" 2>&1 ); then echo "=> PASS test" >> "$out"; else echo "=> FAIL test" >> "$out"; ok=1; fi
  return $ok
}
gates_tail() { grep -n -E '^=> FAIL|error TS|✕|●.*›|Error:|warning|\[warn\]|✖' "$1" | head -60; }

# baseline: do not start on a broken tree (otherwise every issue would "fail")
if [ "$SKIP_BASELINE" != 1 ]; then
  log "Baseline gates on $INTEG_BRANCH..."
  if ! run_gates "$STATE/baseline-gates.txt"; then
    log "BASELINE FAILED. See $STATE/baseline-gates.txt. Fix the base branch first (or SKIP_BASELINE=1)."
    gates_tail "$STATE/baseline-gates.txt" | head -20
    exit 1
  fi
fi

# ---- provider selection with usage-limit handling ----
LIMITED_claude=0; LIMITED_codex=0; WAITED=0
pref_provider() { case "$1" in plan|review) echo claude ;; *) echo codex ;; esac; }
other_provider() { [ "$1" = claude ] && echo codex || echo claude; }
have_provider() { [ "$1" = claude ] && return 0; command -v "$CODEX_BIN" >/dev/null 2>&1 || [ "$FAKE_AGENTS" = 1 ]; }
is_limited() { local now v; now="$(date +%s)"; eval "v=\$LIMITED_$1"; [ "$v" -gt "$now" ]; }
mark_limited() { local secs=$(( LIMIT_WAIT_MINUTES * 60 )); [ "$secs" -lt 2 ] && secs=2; eval "LIMITED_$1=$(( $(date +%s) + secs ))"; log "Provider $1 hit its usage limit; treating it as unavailable for ${LIMIT_WAIT_MINUTES} min."; }
choose_provider() { # role -> echoes provider, or "" if both unavailable
  local pref other; pref="$(pref_provider "$1")"
  [ "${SWAP_ROLE:-0}" = 1 ] && [ "$1" = implement ] && pref="$(other_provider "$pref")"
  other="$(other_provider "$pref")"
  if have_provider "$pref" && ! is_limited "$pref"; then echo "$pref"; return; fi
  if [ "$ALLOW_FALLBACK" = 1 ] && have_provider "$other" && ! is_limited "$other"; then echo "$other"; return; fi
  echo ""
}

invoke_claude() { # role prompt out err
  local role="$1" prompt="$2" out="$3" err="$4" sid; sid="$(uuidgen | tr 'A-Z' 'a-z')"
  local args=(-p --session-id "$sid" --output-format stream-json --verbose --permission-mode acceptEdits
              --settings "$OVN/claude-settings/$role.json" --add-dir "$STATE"
              --allowedTools "$CLAUDE_ALLOWED" --disallowedTools "$CLAUDE_DENIED")
  [ -n "$CLAUDE_MODEL" ] && args+=(--model "$CLAUDE_MODEL")
  [ -n "$CLAUDE_EFFORT" ] && args+=(--effort "$CLAUDE_EFFORT")
  [ -n "$BUDGET_USD" ] && [ "$BUDGET_USD" != 0 ] && args+=(--max-budget-usd "$BUDGET_USD")
  ( cd "$WT" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT "$CLAUDE_BIN" "${args[@]}" < "$prompt" > "$out" 2> "$err" )
}
invoke_codex() { # role prompt out err
  local prompt="$2" out="$3" err="$4" last="$3.last"
  local args=(exec -s workspace-write -C "$WT" --add-dir "$STATE" --json -o "$last")
  [ -n "$CODEX_MODEL" ] && args+=(-m "$CODEX_MODEL")
  ( cd "$WT" && "$CODEX_BIN" "${args[@]}" - < "$prompt" > "$out" 2> "$err" )
}

AGENT_PROVIDER=""; AGENT_STATUS=""; AGENT_NOTE=""
# run_agent role template tag [extra render args...] -> sets AGENT_STATUS ok|error|giveup
run_agent() {
  local role="$1" tpl="$2" tag="$3"; shift 3
  local prov code parsed st note n=0 prompt out err limits=0
  while :; do
    prov="$(choose_provider "$role")"
    if [ -z "$prov" ]; then
      if [ "$WAITED" -ge $(( LIMIT_WAIT_MAX_HOURS * 3600 )) ]; then AGENT_STATUS=giveup; AGENT_NOTE="both providers limited for ${LIMIT_WAIT_MAX_HOURS}h"; return; fi
      log "Both Claude and Codex are unavailable (usage limits). Sleeping ${LIMIT_WAIT_MINUTES} min (waited so far: $((WAITED/60)) min)."
      sleep $(( LIMIT_WAIT_MINUTES * 60 )); WAITED=$(( WAITED + LIMIT_WAIT_MINUTES * 60 ))
      LIMITED_claude=0; LIMITED_codex=0
      [ -f "$STOPF" ] && { AGENT_STATUS=giveup; AGENT_NOTE="stop requested while waiting"; return; }
      continue
    fi
    [ "$prov" != "$(pref_provider "$role")" ] && [ "${SWAP_ROLE:-0}" != 1 ] && log "DEGRADED: $role runs on $prov (preferred $(pref_provider "$role") is limited)."
    AGENT_PROVIDER="$prov"
    prompt="$CUR_WORK/$tag.prompt.md"; out="$LOGS/$(num3 "$CUR_NUM")-$tag-$(date +%H%M%S).jsonl"; err="$out.err"
    local note_arg=(); [ "$prov" = codex ] && note_arg=(--note "$PROMPTS/codex-note.md")
    [ -n "${EXTRA_NOTE:-}" ] && note_arg=(${note_arg[@]+"${note_arg[@]}"} --note "$EXTRA_NOTE")
    if [ "$role" = plan ] && [ -f "$CUR_WORK/previous-failure.md" ]; then note_arg=(${note_arg[@]+"${note_arg[@]}"} --note "$PROMPTS/previous-failure-note.md"); fi
    python3 -I "$OVN/lib/render.py" "$tpl" "$PROMPTS/common.md" "$prompt" ${note_arg[@]+"${note_arg[@]}"} \
      WT="$WT" BRANCH="$CUR_BRANCH" NUM="$CUR_NUM" TITLE="$CUR_TITLE" ISSUE_FILE="$CUR_ISSUE_FILE" WORK="$CUR_WORK" \
      DESIGN_FILE="$DESIGN_FILE" REFS="$REFS" BACKEND_DIR="$BACKEND_DIR" BACKEND_BRANCH="$BACKEND_BRANCH" BACKEND_SHA="${BACKEND_SHA:0:9}" \
      TODAY="$(date +%Y-%m-%d)" TIER="$CUR_TIER" TIER_NOTE="$CUR_TIER_NOTE" \
      INTEG_BRANCH="$INTEG_BRANCH" STATE="$STATE" MAX_ROUNDS="$MAX_ROUNDS" ROUND="$CUR_ROUND" FEEDBACK_FILE="$CUR_FEEDBACK" "$@"
    log "[$role/$prov] fresh session for #$CUR_NUM ($tag)"
    if [ "$FAKE_AGENTS" = 1 ]; then "$OVN/selftest/fake-agent.sh" "$prov" "$role" "$prompt" "$out" "$err" "$WT" "$CUR_WORK"; code=$?
    elif [ "$prov" = claude ]; then invoke_claude "$role" "$prompt" "$out" "$err"; code=$?
    else invoke_codex "$role" "$prompt" "$out" "$err"; code=$?; fi
    parsed="$(python3 -I "$OVN/lib/agent_out.py" "$prov" "$out" "$err" "$code")"
    st="${parsed%%$'\t'*}"; note="${parsed#*$'\t'}"
    log "[$role/$prov] $st: $note"
    case "$st" in
      ok) AGENT_STATUS=ok; AGENT_NOTE="$note"; return ;;
      limit) mark_limited "$prov"; limits=$((limits+1))
             if [ "$limits" -gt 30 ]; then AGENT_STATUS=giveup; AGENT_NOTE="too many usage-limit responses"; return; fi
             continue ;;
      transient)
        n=$((n+1))
        if [ "$n" -le "$TRANSIENT_RETRIES" ]; then log "Temporary error, retry $n/$TRANSIENT_RETRIES in $((n*n*60))s"; sleep $((n*n*60)); continue; fi
        AGENT_STATUS=error; AGENT_NOTE="repeated temporary errors: $note"; return ;;
      *) AGENT_STATUS=error; AGENT_NOTE="$note"; return ;;
    esac
  done
}

# ---- tree snapshots: detect and undo edits an agent was not allowed to make ----
snapshot_tree() { # tag
  ( cd "$WT" && { git ls-files -m -o --exclude-standard; git ls-files -d; } | sort -u > "$CUR_WORK/$1.files"
    tar -cf "$CUR_WORK/$1.tar" -T <(git ls-files -m -o --exclude-standard) 2>/dev/null; git diff HEAD | shasum | cut -d' ' -f1 > "$CUR_WORK/$1.diffhash"
    git ls-files -o --exclude-standard | while read -r f; do shasum "$f"; done | shasum | cut -d' ' -f1 >> "$CUR_WORK/$1.diffhash" )
}
tree_changed_since() { # tag -> 0 if the tree differs from the snapshot
  local now; now="$( cd "$WT" && { git diff HEAD | shasum | cut -d' ' -f1; git ls-files -o --exclude-standard | while read -r f; do shasum "$f"; done | shasum | cut -d' ' -f1; } )"
  [ "$now" != "$(cat "$CUR_WORK/$1.diffhash")" ]
}
restore_snapshot() { # tag
  ( cd "$WT" && git checkout -- . 2>/dev/null; git ls-files -o --exclude-standard | xargs -I{} rm -f "{}" 2>/dev/null
    tar -xf "$CUR_WORK/$1.tar" 2>/dev/null )
}
# plan step may only touch tests/** : revert anything else
enforce_plan_scope() {
  local bad f; bad="$(cd "$WT" && { git ls-files -m; git ls-files -o --exclude-standard; } | sort -u | grep -v '^tests/' )"
  if [ -n "$bad" ]; then
    log "SCOPE: planner touched files outside tests/: $(echo "$bad" | tr '\n' ' ') (reverted)"
    for f in $bad; do ( cd "$WT" && { git checkout -- "$f" 2>/dev/null || rm -f "$f"; } ); done
  fi
}

# ---- one issue ----
CUR_NUM=""; CUR_TITLE=""; CUR_ISSUE_FILE=""; CUR_WORK=""; CUR_BRANCH=""; CUR_TIER=""; CUR_TIER_NOTE=""; CUR_ROUND=1; CUR_FEEDBACK=""
RESULT=""; RESULT_NOTE=""

write_feedback_from_gates() { { echo "# Gate failures (runner output, round $1)"; echo; gates_tail "$CUR_WORK/gates-last.txt"; echo; echo "Full output: $CUR_WORK/gates-last.txt"; } > "$CUR_WORK/feedback-$1.md"; }

# After a PASS: one extra pass for MINOR findings. It only keeps its changes if every gate still passes;
# otherwise the reviewed state is restored. There is no second review, so the prompt limits it to safe fixes.
polish_minor() { # round
  [ "$POLISH_MINOR" = 1 ] || return 0
  local rv="$CUR_WORK/review-$1.md" n
  n="$(grep -cE '^[0-9]+\.[[:space:]]+(\*\*)?MINOR' "$rv" 2>/dev/null || true)"
  [ "${n:-0}" -gt 0 ] || return 0
  log "POLISH: $n MINOR finding(s) from review $1; running one polish pass."
  snapshot_tree "pre-polish-$1"
  CUR_ROUND="$1-polish"; CUR_FEEDBACK="$rv"
  EXTRA_NOTE="$PROMPTS/polish-note.md" run_agent implement "$PROMPTS/04-fix.md" "impl-$1-polish"
  if [ "$AGENT_STATUS" != ok ]; then log "POLISH skipped ($AGENT_NOTE); keeping the reviewed state."; restore_snapshot "pre-polish-$1"; CUR_ROUND="$1"; return 0; fi
  if run_gates "$CUR_WORK/gates-polish.txt"; then
    cp "$CUR_WORK/gates-polish.txt" "$CUR_WORK/gates-last.txt"; log "POLISH applied; all gates still pass."
  else
    log "POLISH reverted: gates failed after the polish pass; keeping the reviewed state."; restore_snapshot "pre-polish-$1"
  fi
  CUR_ROUND="$1"
}

pipeline() { # sets RESULT = done | partial | blocked | failed | paused
  local plan_ok="$CUR_WORK/plan.ok" round prevhash="" hash impl_role verdict
  RESULT="failed"; RESULT_NOTE=""
  rm -f "$CUR_WORK/result.txt"
  # ---- 1 plan + red tests (Claude) ----
  if [ ! -f "$plan_ok" ]; then
    rm -f "$CUR_WORK/blocked.txt"
    python3 -I "$OVN/lib/design_spec.py" "$DESIGN_FILE" "$CUR_ISSUE_FILE" "$CUR_WORK/design-spec.md" >/dev/null
    snapshot_tree pre-plan
    CUR_ROUND=1; run_agent plan "$PROMPTS/01-plan-and-red-tests.md" plan
    if [ "$AGENT_STATUS" = giveup ]; then RESULT=paused; RESULT_NOTE="$AGENT_NOTE"; return; fi
    if [ "$AGENT_STATUS" != ok ]; then RESULT=failed; RESULT_NOTE="plan step: $AGENT_NOTE"; return; fi
    enforce_plan_scope
    if [ -f "$CUR_WORK/blocked.txt" ] && head -1 "$CUR_WORK/blocked.txt" | grep -q '^BLOCKED'; then RESULT=blocked; RESULT_NOTE="$(head -1 "$CUR_WORK/blocked.txt")"; return; fi
    if [ ! -s "$CUR_WORK/plan.md" ] || ! grep -q '^## Acceptance checklist' "$CUR_WORK/plan.md"; then RESULT=failed; RESULT_NOTE="plan.md missing or incomplete"; return; fi
    if ! grep -q '^## Backend alignment' "$CUR_WORK/plan.md"; then RESULT=failed; RESULT_NOTE="plan.md has no '## Backend alignment' section (every issue must be checked against the backend code)"; return; fi
    # The RED check runs whenever tests are listed. A TEST_EXEMPT line only counts when NO test files are
    # listed (otherwise a partial exemption, e.g. for a type-only change, would switch the check off).
    local tf files=""; files="$(sed -n '/^TEST_FILES:/,/^## /p' "$CUR_WORK/plan.md" | grep -E '^- tests/' | sed 's/^- //')"
    if [ -n "$files" ]; then
      for tf in $files; do [ -f "$WT/$tf" ] || { RESULT=failed; RESULT_NOTE="planned test file missing: $tf"; return; }; done
      # RED check: the new tests must fail now (otherwise they prove nothing)
      if ( cd "$WT" && CI=1 npx jest --ci $files > "$CUR_WORK/red.txt" 2>&1 ); then
        log "WARNING: planned tests already pass before implementation (RED check failed). The reviewer will judge whether they prove anything."
        echo "RED CHECK: tests already passed" >> "$CUR_WORK/red.txt"
      else
        grep -qE 'No tests found|Cannot find module|SyntaxError' "$CUR_WORK/red.txt" && log "WARNING: red tests fail for a possibly wrong reason (see $CUR_WORK/red.txt)."
      fi
    elif ! grep -q '^TEST_EXEMPT:' "$CUR_WORK/plan.md"; then
      RESULT=failed; RESULT_NOTE="plan lists no TEST_FILES (and no TEST_EXEMPT)"; return
    fi
    touch "$plan_ok"
  fi
  # ---- 2..5 implement / gates / review / fix loop (ralph-style, bounded) ----
  local start=1; [ -f "$CUR_WORK/round.n" ] && start="$(( $(cat "$CUR_WORK/round.n") + 1 ))"
  CUR_FEEDBACK=""
  [ -f "$CUR_WORK/last-feedback.txt" ] && CUR_FEEDBACK="$(cat "$CUR_WORK/last-feedback.txt")"
  round="$start"
  while [ "$round" -le "$MAX_ROUNDS" ]; do
    CUR_ROUND="$round"; echo "$((round-1))" > "$CUR_WORK/round.n"
    local tpl="$PROMPTS/02-implement.md"; [ "$round" -gt 1 ] && tpl="$PROMPTS/04-fix.md"
    if [ "$round" -gt 1 ] && [ -z "$CUR_FEEDBACK" ]; then tpl="$PROMPTS/02-implement.md"; fi
    # stuck detection: the same feedback twice in a row -> swap the implementer for one round
    if [ -n "$CUR_FEEDBACK" ]; then hash="$(shasum "$CUR_FEEDBACK" | cut -d' ' -f1)"; else hash=""; fi
    local swap=0; [ -n "$hash" ] && [ "$hash" = "$(cat "$CUR_WORK/prev-feedback.hash" 2>/dev/null)" ] && swap=1
    [ -n "$hash" ] && echo "$hash" > "$CUR_WORK/prev-feedback.hash"
    impl_role=implement
    if [ "$swap" = 1 ]; then log "Same feedback twice: asking the other provider to implement this round."; fi
    snapshot_tree "pre-impl-$round"
    SWAP_ROLE="$swap" run_agent "$impl_role" "$tpl" "impl-$round"
    if [ "$AGENT_STATUS" = giveup ]; then RESULT=paused; RESULT_NOTE="$AGENT_NOTE"; return; fi
    if [ "$AGENT_STATUS" != ok ]; then RESULT=failed; RESULT_NOTE="implement round $round: $AGENT_NOTE"; return; fi
    if [ -f "$CUR_WORK/blocked.txt" ] && head -1 "$CUR_WORK/blocked.txt" | grep -q '^BLOCKED'; then RESULT=blocked; RESULT_NOTE="$(head -1 "$CUR_WORK/blocked.txt")"; return; fi
    # gates (runner-run)
    if run_gates "$CUR_WORK/gates-last.txt"; then
      cp "$CUR_WORK/gates-last.txt" "$CUR_WORK/gates-$round.txt"
      # ---- review (Claude, read-only) ----
      snapshot_tree "pre-review-$round"
      run_agent review "$PROMPTS/03-review.md" "review-$round"
      if [ "$AGENT_STATUS" = giveup ]; then RESULT=paused; RESULT_NOTE="$AGENT_NOTE"; return; fi
      if tree_changed_since "pre-review-$round"; then log "SCOPE: reviewer modified the tree; restoring it."; restore_snapshot "pre-review-$round"; fi
      verdict="$(head -1 "$CUR_WORK/review-$round.md" 2>/dev/null | tr -d '\r')"
      if [ "$AGENT_STATUS" = ok ] && [ "$verdict" = "VERDICT: PASS" ]; then polish_minor "$round"; RESULT=reviewed; RESULT_NOTE="review passed in round $round"; echo "$round" > "$CUR_WORK/round.n"; return; fi
      if [ "$AGENT_STATUS" != ok ] || [ -z "$verdict" ]; then log "Review step gave no usable verdict ($AGENT_NOTE); retrying the review once.";
        run_agent review "$PROMPTS/03-review.md" "review-$round-retry"; verdict="$(head -1 "$CUR_WORK/review-$round.md" 2>/dev/null)"
        if tree_changed_since "pre-review-$round"; then restore_snapshot "pre-review-$round"; fi
        [ "$verdict" = "VERDICT: PASS" ] && { polish_minor "$round"; RESULT=reviewed; RESULT_NOTE="review passed in round $round"; echo "$round" > "$CUR_WORK/round.n"; return; }
      fi
      CUR_FEEDBACK="$CUR_WORK/review-$round.md"
      log "Review round $round: $verdict"
    else
      log "Gates failed in round $round."
      write_feedback_from_gates "$round"; CUR_FEEDBACK="$CUR_WORK/feedback-$round.md"
    fi
    echo "$CUR_FEEDBACK" > "$CUR_WORK/last-feedback.txt"
    round=$((round+1))
  done
  RESULT=failed; RESULT_NOTE="not passing review/gates after $MAX_ROUNDS rounds"
  { echo "# Why attempt $ATTEMPT failed"; echo; echo "$RESULT_NOTE"; echo; [ -n "$CUR_FEEDBACK" ] && { echo "Last feedback:"; echo; cat "$CUR_FEEDBACK"; }; } > "$CUR_WORK/previous-failure.md"
}

finalize() { # after a passed review: gates, scope, index, commit, merge, comment. sets RESULT done|partial|failed
  local forbidden changed pf commit ntests
  changed="$(cd "$WT" && { git ls-files -m; git ls-files -o --exclude-standard; git ls-files -d; } | sort -u)"
  forbidden="$(echo "$changed" | grep -E "^($DESIGN_DIR_NAME/|designs/|CLAUDE.md|AGENTS.md|\.husky/|\.github/|\.claude/|scripts/overnight/|package.json|package-lock.json)" || true)"
  if [ -n "$forbidden" ]; then RESULT=failed; RESULT_NOTE="forbidden files changed: $(echo "$forbidden" | tr '\n' ' ')"; return; fi
  if ! run_gates "$CUR_WORK/gates-final.txt"; then RESULT=failed; RESULT_NOTE="final gates failed"; return; fi
  ( cd "$WT" && git add -A >/dev/null 2>&1 )
  python3 -I "$OVN/lib/records.py" index "$WT" "$INTEG_BRANCH" "$CUR_NUM" "$CUR_TITLE" "$(date +%Y-%m-%d)" >/dev/null
  ( cd "$WT" && git add -A >/dev/null 2>&1 )
  ntests="$(cd "$WT" && git diff --cached --name-only --diff-filter=A -- tests/regression | grep -c '\.test\.' || true)"
  local kind="Fix"
  local body="$CUR_WORK/commit-msg.txt"
  { echo "$kind #$CUR_NUM: $CUR_TITLE"; echo; echo "Issue: https://github.com/$REPO_SLUG/issues/$CUR_NUM"
    echo "Pipeline: plan+tests (claude) -> implement (codex) -> gates -> review (claude); rounds: $(cat "$CUR_WORK/round.n" 2>/dev/null)"
    echo "New regression test files: $ntests"
    [ -f "$CUR_WORK/blocked.txt" ] && { echo; echo "Partial: $(head -1 "$CUR_WORK/blocked.txt")"; }
    echo; echo "$COMMIT_TRAILER1"; echo "$COMMIT_TRAILER2"; } > "$body"
  if ! ( cd "$WT" && git commit -q -F "$body" ) >"$CUR_WORK/commit.log" 2>&1; then
    RESULT=failed; RESULT_NOTE="git commit failed (hooks?): $(tail -3 "$CUR_WORK/commit.log" | tr '\n' ' ')"; return
  fi
  commit="$(cd "$WT" && git rev-parse HEAD)"
  if ! ( cd "$WT" && git checkout -q "$INTEG_BRANCH" && git merge -q --no-ff "$CUR_BRANCH" -m "Merge #$CUR_NUM: $CUR_TITLE" ) >"$CUR_WORK/merge.log" 2>&1; then
    ( cd "$WT" && git merge --abort >/dev/null 2>&1; git checkout -q "$CUR_BRANCH" >/dev/null 2>&1 )
    RESULT=failed; RESULT_NOTE="merge into $INTEG_BRANCH failed"; return
  fi
  CUR_COMMIT="$commit"
  RESULT=done; [ -f "$CUR_WORK/blocked.txt" ] && head -1 "$CUR_WORK/blocked.txt" | grep -q '^PARTIAL' && RESULT=partial
}

gh_comment() { # status-line
  [ "$GH_COMMENT" = 1 ] || return 0
  command -v gh >/dev/null 2>&1 || return 0
  local f="$CUR_WORK/gh-comment.md"
  { echo "**Overnight run: $1**"; echo
    echo "- Branch: \`$CUR_BRANCH\` (local only, not pushed), merged locally into \`$INTEG_BRANCH\`"
    [ -n "${CUR_COMMIT:-}" ] && echo "- Commit: \`${CUR_COMMIT:0:9}\`"
    echo "- Review rounds: $(cat "$CUR_WORK/round.n" 2>/dev/null || echo '?'); gates (typecheck, lint, strict eslint, format, tests): $(grep -c '^=> PASS' "$CUR_WORK/gates-final.txt" 2>/dev/null || echo 0)/5 passed"
    echo "- New regression tests: $(cd "$WT" 2>/dev/null && git show --stat --format= --diff-filter=A "${CUR_COMMIT:-HEAD}" -- tests/regression 2>/dev/null | grep -c '\.test\.' || echo 0)"
    [ -f "$CUR_WORK/blocked.txt" ] && { echo; echo "Needs the owner:"; echo; sed 's/^/> /' "$CUR_WORK/blocked.txt" | head -25; }
    echo; echo "_Not closed automatically: it closes when the branch is reviewed and merged._"; } > "$f"
  gh issue comment "$CUR_NUM" -R "$REPO_SLUG" --body-file "$f" >/dev/null 2>&1 && log "Commented on GitHub issue #$CUR_NUM." || log "Could not comment on GitHub issue #$CUR_NUM (continuing)."
}

run_issue() { # num tier
  CUR_NUM="$1"; CUR_TIER="$2"; CUR_ISSUE_FILE="$(issue_file "$1")"; CUR_TITLE="$(title_of "$CUR_ISSUE_FILE")"
  snapshot_backend   # picks up a moved backend branch between issues
  CUR_WORK="$WORK_ROOT/$(num3 "$1")"; mkdir -p "$CUR_WORK"; CUR_COMMIT=""
  cp -f "$CUR_ISSUE_FILE" "$CUR_WORK/issue.md"; CUR_ISSUE_FILE="$CUR_WORK/issue.md"   # inside the readable state folder
  CUR_BRANCH="feature/$1-$(slug_of "$CUR_TITLE")"
  case "$CUR_TIER" in
    run) CUR_TIER_NOTE="(do the whole issue)" ;;
    *) CUR_TIER_NOTE="(do everything that is possible; report what is not as PARTIAL in blocked.txt)" ;;
  esac
  ATTEMPT=$(( $(attempts_get "$1") + 1 ))
  CURRENT_NUM="$1"
  status_set "$1" running "$ATTEMPT" "$CUR_TITLE" "$CUR_BRANCH"
  log "=== #$1 [$CUR_TIER] $CUR_TITLE (attempt $ATTEMPT/$MAX_ATTEMPTS) ==="
  # branch off the integration branch (resume if it already exists)
  ( cd "$WT" && git checkout -q "$INTEG_BRANCH" >/dev/null 2>&1 )
  if ( cd "$WT" && git show-ref --verify --quiet "refs/heads/$CUR_BRANCH" ); then ( cd "$WT" && git checkout -q "$CUR_BRANCH" )
  else ( cd "$WT" && git checkout -q -b "$CUR_BRANCH" "$INTEG_BRANCH" ); fi
  pipeline
  if [ "$RESULT" = reviewed ]; then finalize; fi
  case "$RESULT" in
    done|partial)
      echo "$RESULT" | tr a-z A-Z > "$CUR_WORK/result.txt"
      status_set "$1" "$RESULT" "$ATTEMPT" "${RESULT_NOTE}" "$CUR_BRANCH" "$CUR_COMMIT"
      log "$(echo "$RESULT" | tr a-z A-Z): #$1 committed ${CUR_COMMIT:0:9} on $CUR_BRANCH, merged into $INTEG_BRANCH."
      gh_comment "$RESULT" ;;
    blocked)
      ( cd "$WT" && git diff HEAD > "$CUR_WORK/blocked.patch" 2>/dev/null; git checkout -q -- . ; git clean -fdq -e node_modules -e "$DESIGN_DIR_NAME" . ; git checkout -q "$INTEG_BRANCH" )
      echo "$RESULT_NOTE" > "$CUR_WORK/result.txt"
      status_set "$1" blocked "$ATTEMPT" "$RESULT_NOTE" "$CUR_BRANCH"
      log "BLOCKED: #$1 ($RESULT_NOTE). Needs you; see $CUR_WORK/blocked.txt. Moving on."
      CUR_COMMIT=""; gh_comment "blocked" ;;
    paused)
      status_set "$1" pending "$(attempts_get "$1")" "paused: $RESULT_NOTE" "$CUR_BRANCH"
      log "PAUSED on #$1: $RESULT_NOTE"; CURRENT_NUM=""; return 75 ;;
    *)
      ( cd "$WT" && git diff HEAD > "$CUR_WORK/attempt-patch.diff" 2>/dev/null )
      if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        ( cd "$WT" && git checkout -q -- . ; git clean -fdq -e node_modules -e "$DESIGN_DIR_NAME" . ; git checkout -q "$INTEG_BRANCH"; git branch -q -D "$CUR_BRANCH" >/dev/null 2>&1 )
        status_set "$1" failed "$ATTEMPT" "$RESULT_NOTE" "$CUR_BRANCH"
        log "FAILED: #$1 after $ATTEMPT attempts ($RESULT_NOTE). Patch kept: $CUR_WORK/attempt-patch.diff. Moving on."
        CUR_COMMIT=""; gh_comment "failed (needs a human look)"
      else
        # fresh start for the next attempt, but remember why this one failed
        ( cd "$WT" && git checkout -q -- . ; git clean -fdq -e node_modules -e "$DESIGN_DIR_NAME" . )
        rm -f "$CUR_WORK/plan.ok" "$CUR_WORK/round.n" "$CUR_WORK/last-feedback.txt" "$CUR_WORK/prev-feedback.hash" "$CUR_WORK/plan.md" "$CUR_WORK"/impl-*.md "$CUR_WORK"/review-*.md
        [ -f "$CUR_WORK/previous-failure.md" ] || echo "# Why attempt $ATTEMPT failed

$RESULT_NOTE" > "$CUR_WORK/previous-failure.md"
        status_set "$1" pending "$ATTEMPT" "retrying: $RESULT_NOTE" "$CUR_BRANCH"
        log "Attempt $ATTEMPT of #$1 did not pass ($RESULT_NOTE); the next attempt starts fresh and sees the failure notes."
      fi ;;
  esac
  CURRENT_NUM=""
  return 0
}

# ---- main loop ----
[ -f "$STOPF" ] && rm -f "$STOPF"
log "Runner started (pid $$). repo=$REPO_SLUG integ=$INTEG_BRANCH worktree=$WT base=$BASE_BRANCH"
DONE_COUNT=0
while :; do
  [ -f "$STOPF" ] && { log "Stop file found: stopping."; rm -f "$STOPF"; break; }
  [ "$MAX_ISSUES" -gt 0 ] && [ "$DONE_COUNT" -ge "$MAX_ISSUES" ] && { log "Reached --max-issues $MAX_ISSUES."; break; }
  NEXT="$(runnable_list | head -1)"
  [ -z "$NEXT" ] && { log "No more runnable issues."; break; }
  n="${NEXT%%$'\t'*}"; t="${NEXT#*$'\t'}"
  CUR_ROUND=1
  run_issue "$n" "$t"; rc=$?
  if [ "$rc" = 75 ]; then log "STOPPING: usage limits (both providers) persisted. Issue #$n stays open. Run again later to continue."; exit 75; fi
  DONE_COUNT=$((DONE_COUNT+1))
  [ -f "$STOPF" ] || sleep "$PAUSE_SECONDS"
done
python3 -I "$OVN/lib/records.py" report "$STATE" "$STATE/REPORT.md" >/dev/null 2>&1
log "Runner finished. Report: $STATE/REPORT.md  (bash scripts/overnight/run-all-tasks.sh --report)"
exit 0
