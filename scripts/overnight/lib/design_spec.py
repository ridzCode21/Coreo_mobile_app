#!/usr/bin/env python3
"""Extract the design spec for the screens named in an issue file.

Usage: design_spec.py <design-html> <issue-file> <out-md>
The design file is one huge HTML canvas. Each screen is a <div data-screen-label="28c Today's plan ...">.
For every screen id listed in the issue ("Screens: 28a, 28b ...") this writes: the visible text (placeholders
like {{ x }} kept), the style facts used on that screen (font sizes/weights, colours, radii, spacing) with
counts, and the raw markup (trimmed). The agents use it so they do not have to read 500 KB of HTML.
"""
import re, sys, html, collections

design, issue, out = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(design, encoding='utf-8').read().split('\n')
idx = [(i, re.search(r'data-screen-label="([^"]*)"', l).group(1)) for i, l in enumerate(lines) if 'data-screen-label=' in l]
text = open(issue, encoding='utf-8').read()
m = re.search(r'\|\s*Screens\s*\|\s*([^|\n]*)\|', text)
tokens = []
if m:
    tokens = [t.strip() for t in re.split(r'[,;]', m.group(1)) if t.strip()]
want = []
for t in tokens:
    t = t.replace('–', '-')
    t = re.sub(r'\s*\(.*?\)', '', t).strip()
    if re.match(r'^\d+[a-z](·\d+)?$', t):
        want.append(t)
    elif re.match(r'^(\d+[a-z])·(\d+)-(\d+)$', t):  # 12a·1-6
        a, lo, hi = re.match(r'^(\d+[a-z])·(\d+)-(\d+)$', t).groups()
        want += [f'{a}·{k}' for k in range(int(lo), int(hi) + 1)]
want = list(dict.fromkeys(want))

def label_matches(label, tok):
    return label == tok or label.startswith(tok + ' ')

sections = []
for n, (i, label) in enumerate(idx):
    if not any(label_matches(label, t) for t in want):
        continue
    j = idx[n + 1][0] if n + 1 < len(idx) else len(lines)
    j = min(j, i + 400)  # the last screen swallows trailing notes; cap it
    chunk = '\n'.join(lines[i:j])
    body = re.sub(r'<(style|script)[^>]*>.*?</\1>', '', chunk, flags=re.S)
    vis = [html.unescape(p.strip()) for p in re.sub(r'<[^>]+>', '\n', body).split('\n') if p.strip()]
    facts = collections.OrderedDict()
    def count(pattern, name, cap=14):
        c = collections.Counter(re.findall(pattern, chunk))
        facts[name] = ', '.join(f'{k} ×{v}' for k, v in c.most_common(cap)) or '-'
    count(r'font-size:\s*([\d.]+px)', 'font sizes')
    count(r'font-weight:\s*(\d{3})', 'font weights')
    count(r'(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\b', 'hex colours')
    count(r'(rgba?\([^)]*\))', 'rgba colours', 12)
    count(r'border-radius:\s*([\d.]+px)', 'radii')
    count(r'(?:padding|margin|gap):\s*([^;"]+)', 'padding / margin / gap', 12)
    count(r'(linear-gradient\([^)]*\))', 'gradients', 6)
    count(r'(backdrop-filter:\s*[^;"]+)', 'blur / glass', 6)
    raw = chunk if len(chunk) <= 16000 else chunk[:16000] + '\n... (trimmed; open the design file at the line range for the rest)'
    sections.append((label, i + 1, j, vis, facts, raw))

with open(out, 'w', encoding='utf-8') as f:
    f.write(f'# Design spec for {issue.split("/")[-1]}\n\n')
    f.write(f'Design file: `{design}` (canvas of screens). Issue screen ids: {", ".join(want) or "none found"}.\n')
    f.write('Authoritative for copy, order, states, spacing, colours and sizes. Brand tokens: `Coreo Brand Book.dc.html` and `docs/design-system.md`.\n')
    f.write('`{{ name }}` marks a value filled in at runtime (not literal copy).\n\n')
    if not sections:
        f.write('No screen ids could be matched in the design file for this issue (the issue may be about tokens or '
                'shared components). Use the issue text, `Coreo Brand Book.dc.html` and `docs/design-system.md`.\n')
    for label, a, b, vis, facts, raw in sections:
        f.write(f'## {label}  (design file lines {a}-{b})\n\n### Visible text, in order\n')
        for k, v in enumerate(vis, 1):
            f.write(f'{k}. {v}\n')
        f.write('\n### Style facts used on this screen (value ×count)\n')
        for k, v in facts.items():
            f.write(f'- {k}: {v}\n')
        f.write('\n### Markup\n```html\n' + raw + '\n```\n\n')
print(f'{len(sections)} screens written to {out}')
