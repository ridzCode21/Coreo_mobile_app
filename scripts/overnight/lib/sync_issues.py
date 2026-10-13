#!/usr/bin/env python3
"""Copy open GitHub issues (label area:frontend) into local files: issues/NNN-slug.md.

Usage: sync_issues.py <repo-slug> <issues-dir> [--label area:frontend]
The runner reads these files; the GitHub issue stays the source of truth for the text. Existing files
are overwritten so a re-sync picks up edits made on GitHub.
"""
import json, re, subprocess, sys, os

repo, out_dir = sys.argv[1], sys.argv[2]
label = 'area:frontend'
if '--label' in sys.argv:
    label = sys.argv[sys.argv.index('--label') + 1]
os.makedirs(out_dir, exist_ok=True)
raw = subprocess.run(['gh', 'issue', 'list', '-R', repo, '--state', 'open', '--label', label, '--limit', '300',
                      '--json', 'number,title,body,labels,url'], capture_output=True, text=True)
if raw.returncode != 0:
    sys.exit('gh failed: ' + raw.stderr.strip())
issues = json.loads(raw.stdout)

def slug(t):
    s = re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
    return s[:48].strip('-')

written = 0
for i in sorted(issues, key=lambda x: x['number']):
    n = i['number']
    labels = [l['name'] for l in i['labels']]
    size = next((l.split(':')[1] for l in labels if l.startswith('size:')), '?')
    kind = next((l for l in labels if l in ('bug', 'enhancement')), 'enhancement')
    body = i['body'] or ''
    m = re.search(r'Screens:\s*([^\n]*)', body)
    screens = m.group(1).strip().rstrip('.') if m else ''
    # Definition of done = the acceptance criteria checkboxes from the issue
    dod = ''
    m2 = re.search(r'## Acceptance criteria\n(.*?)(?=\n## |\Z)', body, re.S)
    if m2:
        dod = m2.group(1).strip()
    text = f"""# {n:03d} - {i['title']}

| Field | Value |
| --- | --- |
| GitHub | {i['url']} |
| Type | {kind} |
| Size | {size} |
| Screens | {screens} |
| Labels | {', '.join(labels)} |

{body.strip()}

## Definition of done (from the acceptance criteria)

{dod or '_see the issue body_'}
"""
    path = os.path.join(out_dir, f"{n:03d}-{slug(i['title'])}.md")
    # drop older file names for the same number (title edits)
    for f in os.listdir(out_dir):
        if f.startswith(f"{n:03d}-") and os.path.join(out_dir, f) != path:
            os.remove(os.path.join(out_dir, f))
    open(path, 'w').write(text)
    written += 1
print(f'synced {written} open issues with label {label} into {out_dir}')
