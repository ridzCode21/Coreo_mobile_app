#!/usr/bin/env bash
# Fake Claude/Codex used ONLY by selftest/run-selftest.sh. Args: provider role prompt out err wt work
provider="$1"; role="$2"; prompt="$3"; out="$4"; err="$5"; wt="$6"; work="$7"
num="$(basename "$work" | sed 's/^0*//')"; tag="$(basename "$prompt" .prompt.md)"
emit_ok() {
  if [ "$provider" = claude ]; then echo '{"type":"result","subtype":"success","is_error":false,"result":"ok","total_cost_usd":0.01,"num_turns":3}' > "$out"
  else echo '{"type":"item.completed","item":{"id":"i","type":"agent_message","text":"done"}}' > "$out"; fi
  exit 0
}
if [ "$provider" = claude ] && [ "${FAKE_LIMIT_CLAUDE:-0}" = 1 ]; then echo '{"type":"result","is_error":true,"result":"You have hit your usage limit","subtype":"error"}' > "$out"; echo "usage limit reached" > "$err"; exit 1; fi
if [ "$provider" = codex ] && [ "${FAKE_LIMIT_CODEX:-0}" = 1 ]; then echo '{"type":"error","message":"usage limit reached"}' > "$out"; echo "usage limit reached" > "$err"; exit 1; fi
echo "$provider $role $tag" >> "$work/fake-calls.txt"
case "$tag" in
  plan)
    if [ "${FAKE_SCENARIO:-ok}" = blocked ] && [ "$num" = "$FAKE_BLOCK_NUM" ]; then echo "BLOCKED: needs a new native module" > "$work/blocked.txt"; emit_ok; fi
    mkdir -p "$wt/tests/regression/fake"; echo "// test for $num" > "$wt/tests/regression/fake/f$num.test.ts"
    printf '# Plan for #%s\n## Decision log\nx\n## Test plan\nx\nTEST_FILES:\n- tests/regression/fake/f%s.test.ts\n## Acceptance checklist\n1. works\n## Out of scope / Blocked\nnone\n' "$num" "$num" > "$work/plan.md"
    if [ "${FAKE_SCENARIO:-ok}" = partial ] && [ "$num" = "$FAKE_BLOCK_NUM" ]; then echo "PARTIAL: backend list endpoint missing" > "$work/blocked.txt"; fi
    emit_ok ;;
  impl-*)
    n="${tag#impl-}"
    mkdir -p "$wt/src"
    if [ "$n" = "1-polish" ] && [ "${FAKE_SCENARIO:-ok}" = polish_breaks ]; then echo "export const x = 'BROKEN';" > "$wt/src/fake-$num.ts"; touch "$wt/.impl-done"; echo "polish" > "$work/impl-$n.md"; emit_ok; fi
    if [ "$n" = 1 ] && [ "${FAKE_SCENARIO:-ok}" = review_fail_once ]; then echo "export const x = 'FLAW';" > "$wt/src/fake-$num.ts"
    elif [ "$n" = 1 ] && [ "${FAKE_SCENARIO:-ok}" = gate_fail_once ]; then echo "export const x = 'BROKEN';" > "$wt/src/fake-$num.ts"
    else echo "export const x = 'good';" > "$wt/src/fake-$num.ts"; fi
    touch "$wt/.impl-done"; echo "impl $n done" > "$work/impl-$n.md"; emit_ok ;;
  review-*)
    n="${tag#review-}"; n="${n%%-*}"
    if grep -q FLAW "$wt/src/fake-$num.ts" 2>/dev/null; then printf 'VERDICT: FAIL\n1. MAJOR src/fake-%s.ts:1 remove FLAW\n' "$num" > "$work/review-$n.md"
    elif [ "${FAKE_SCENARIO:-ok}" = minor_findings ] || [ "${FAKE_SCENARIO:-ok}" = polish_breaks ]; then printf 'VERDICT: PASS\n## Findings\n1. MINOR - tidy x\n' > "$work/review-$n.md"
    else printf 'VERDICT: PASS\nall good\n' > "$work/review-$n.md"; fi
    if [ "${FAKE_SCENARIO:-ok}" = reviewer_edits ]; then echo "tampered" >> "$wt/src/fake-$num.ts"; fi
    emit_ok ;;
esac
emit_ok
