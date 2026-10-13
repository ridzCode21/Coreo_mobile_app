#!/usr/bin/env python3
"""Bookkeeping helpers.

  records.py index  <repo-dir> <base-ref> <issue-num> <issue-title> <date>
      append a row to tests/regression/INDEX.md for each NEW test file added since <base-ref>
  records.py report <state-dir> <out-file>
      write the morning summary from status.tsv, work/*/ and the runner log
"""
import os, re, subprocess, sys

def sh(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True).stdout

def index(repo, base, num, title, date):
    new = sh(['git', 'diff', '--cached', '--name-only', '--diff-filter=A', '--', 'tests/regression'], repo).split()
    new += sh(['git', 'diff', '--name-only', '--diff-filter=A', base, 'HEAD', '--', 'tests/regression'], repo).split()
    new += sh(['git', 'ls-files', '-o', '--exclude-standard', '--', 'tests/regression'], repo).split()
    tests = sorted({p for p in new if re.search(r'\.test\.(ts|tsx)$', p)})
    path = os.path.join(repo, 'tests/regression/INDEX.md')
    cur = open(path).read() if os.path.exists(path) else ''
    rows = []
    for t in tests:
        rel = t.replace('tests/regression/', '')
        if f'`{rel}`' in cur:
            continue
        feature = rel.split('/')[0]
        # first describe() text is the best one-line summary of what the file protects
        m = re.search(r"describe\(\s*['\"`]([^'\"`]+)", open(os.path.join(repo, t)).read())
        what = (m.group(1) if m else rel).replace('|', '/')
        rows.append(f'| `{rel}` | {feature} | {what} | #{int(num)} {title[:60].replace("|", "/")} | {date} |')
    if rows:
        if not cur.endswith('\n'):
            cur += '\n'
        open(path, 'w').write(cur + '\n'.join(rows) + '\n')
    print(f'{len(rows)} index rows added')

def report(state, out):
    status = os.path.join(state, 'status.tsv')
    lines = ['# Overnight run report', '']
    if not os.path.exists(status):
        open(out, 'w').write('# Overnight run report\n\nNo runs yet.\n'); return
    rows = [l.rstrip('\n').split('\t') for l in open(status) if l.strip()]
    counts = {}
    for r in rows:
        counts[r[1]] = counts.get(r[1], 0) + 1
    lines.append('Totals: ' + ', '.join(f'{k}={v}' for k, v in sorted(counts.items())))
    lines += ['', '| Issue | Status | Attempts | Branch | Commit | Note |', '| --- | --- | --- | --- | --- | --- |']
    for r in rows:
        r += [''] * (7 - len(r))
        lines.append(f'| #{int(r[0])} | {r[1]} | {r[2]} | {r[5]} | {r[6][:9]} | {r[4][:120]} |')
    lines += ['', '## Needs you (blocked, partial, failed)', '']
    for r in rows:
        if r[1] in ('blocked', 'partial', 'failed'):
            w = os.path.join(state, 'work', r[0])
            reason = ''
            for name in ('blocked.txt', 'result.txt'):
                p = os.path.join(w, name)
                if os.path.exists(p):
                    reason = open(p).read().strip()[:600]; break
            lines.append(f'- **#{int(r[0])}** ({r[1]}): {reason or r[4]}')
    open(out, 'w').write('\n'.join(lines) + '\n')
    print(f'report written to {out}')

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'index':
        index(*sys.argv[2:7])
    elif cmd == 'report':
        report(sys.argv[2], sys.argv[3])
