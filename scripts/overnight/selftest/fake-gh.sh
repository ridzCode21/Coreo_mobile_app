#!/usr/bin/env bash
# Fake `gh` for the self-test (put first on PATH). The "GitHub" is a bare git repo: $FAKE_REMOTE. State in $FAKE_GH_STATE.
S="${FAKE_GH_STATE:?}"; R="${FAKE_REMOTE:?}"; mkdir -p "$S/prs"
g() { git --git-dir="$R" "$@"; }
case "$1 $2" in
  "auth status") exit 0 ;;
  "pr create")
    shift 2; head=""; base=""; title=""; body=""
    while [ $# -gt 0 ]; do case "$1" in --head) head="$2"; shift ;; --base) base="$2"; shift ;; --title) title="$2"; shift ;; --body-file) body="$2"; shift ;; esac; shift; done
    n=$(( $(ls "$S/prs" | grep -c '\.head$') + 1 ))
    echo "$head" > "$S/prs/$n.head"; echo "$base" > "$S/prs/$n.base"; echo "$title" > "$S/prs/$n.title"; cp "$body" "$S/prs/$n.body"
    echo "https://github.com/fake/repo/pull/$n"; exit 0 ;;
  "pr merge")
    n="$3"; [ "${FAKE_MERGE_FAIL:-0}" = 1 ] && { echo "not mergeable" >&2; exit 1; }
    head="$(cat "$S/prs/$n.head")"; base="$(cat "$S/prs/$n.base")"
    g merge-base --is-ancestor "refs/heads/$base" "refs/heads/$head" || { echo "not a fast-forward" >&2; exit 1; }
    g update-ref "refs/heads/$base" "$(g rev-parse "refs/heads/$head")"; echo merged > "$S/prs/$n.state"; exit 0 ;;
  "api -X")
    # gh api -X DELETE repos/x/git/refs/heads/<branch>
    ref="${4#repos/*/git/refs/}"; g update-ref -d "refs/$ref" 2>/dev/null; exit 0 ;;
  "issue comment") shift 2; echo "comment on #$1" >> "$S/comments"; exit 0 ;;
esac
echo "fake gh: unhandled: $*" >&2; exit 2
