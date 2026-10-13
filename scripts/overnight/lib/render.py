#!/usr/bin/env python3
"""Render a prompt: render.py <template> <common.md> <out> [--note FILE]... KEY=VALUE ...
Replaces {{COMMON}} (with the common rules) and every {{KEY}} (also inside appended notes).
Unknown keys stay visible so a typo is easy to spot."""
import sys
tpl, common, out = sys.argv[1:4]
args = sys.argv[4:]
notes = []
while args and args[0] == '--note':
    notes.append(args[1]); args = args[2:]
vals = dict(a.split('=', 1) for a in args)
text = open(tpl).read().replace('{{COMMON}}', open(common).read())
for n in notes:
    text += '\n\n' + open(n).read()
for k, v in vals.items():
    text = text.replace('{{' + k + '}}', v)
open(out, 'w').write(text)
