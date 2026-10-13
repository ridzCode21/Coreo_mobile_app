#!/usr/bin/env python3
"""Classify the result of one agent run.

Usage: agent_out.py <claude|codex> <output-file> <stderr-file> <exit-code>
Prints one line: STATUS<TAB>summary   with STATUS one of ok | limit | transient | error.
Normal successful output is never scanned for limit words: only error output is.
"""
import json, re, sys

provider, out_path, err_path, code = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
HARD = re.compile(r'usage limit|limit reached|reached your|out of extra usage|credit balance|insufficient (credit|funds|quota)|'
                  r'quota|billing|spend limit|session limit|weekly limit|5-hour limit|plan limit|exceeded your|'
                  r'you.?ve hit your|resets? (at|in)|try again (at|later today)|usage_limit|rate_limit_exceeded.*(day|month)', re.I)
TRANSIENT = re.compile(r'rate.?limit|429|overloaded|529|503|502|econnreset|etimedout|socket hang up|network|temporarily '
                       r'unavailable|timed out|connection|stream disconnected|reconnecting', re.I)

def read(p):
    try:
        return open(p, errors='replace').read()
    except Exception:
        return ''

raw, err = read(out_path), read(err_path)
events = []
for line in raw.splitlines():
    line = line.strip()
    if line.startswith('{'):
        try:
            events.append(json.loads(line))
        except Exception:
            pass

is_error, text, cost, turns, tools, skills = False, '', None, None, 0, []
if provider == 'claude':
    res = [e for e in events if e.get('type') == 'result']
    if res:
        d = res[-1]
        is_error = bool(d.get('is_error'))
        text = (str(d.get('result', '')) + ' ' + str(d.get('subtype', ''))).replace('\n', ' ')
        cost, turns = d.get('total_cost_usd'), d.get('num_turns')
    else:
        is_error, text = True, 'no result event'
    for e in events:
        if e.get('type') == 'assistant':
            for b in (e.get('message') or {}).get('content') or []:
                if isinstance(b, dict) and b.get('type') == 'tool_use':
                    tools += 1
                    if b.get('name') == 'Skill':
                        s = (b.get('input') or {}).get('skill')
                        if s and s not in skills:
                            skills.append(s)
else:  # codex
    msgs = [e for e in events if e.get('type') == 'item.completed' and (e.get('item') or {}).get('type') == 'agent_message']
    if msgs:
        text = str(msgs[-1]['item'].get('text', '')).replace('\n', ' ')
    errs = [e for e in events if e.get('type') in ('error', 'turn.failed')]
    if errs:
        is_error = True
        text = json.dumps(errs[-1])[:600]
    tools = len([e for e in events if e.get('type') == 'item.completed' and (e.get('item') or {}).get('type') in ('command_execution', 'file_change')])
    if not events:
        is_error = True

blob = ' '.join([text if is_error else '', err[-3000:] if (code != 0 or is_error) else ''])
if code == 0 and not is_error:
    status = 'ok'
elif HARD.search(blob):
    status = 'limit'
elif TRANSIENT.search(blob):
    status = 'transient'
else:
    status = 'error'
summary = f'provider={provider} tool_calls={tools}'
if provider == 'claude':
    summary += f" turns={turns} cost_usd={cost} skills=[{', '.join(skills) or 'none'}]"
detail = (text if status != 'ok' else '')[:240] or err[-240:].replace('\n', ' ')
print(f'{status}\t{summary} {detail if status != "ok" else ""}'.strip())
