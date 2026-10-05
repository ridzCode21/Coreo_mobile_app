---
name: design-alignment
description: >-
  Strict check that UI code matches the Claude Design in designs/ before committing. Use before
  every git commit that touches screens, components, copy, or styling, and whenever asked whether
  the UI matches the design.
---

# Design alignment

The Claude Design files in `designs/` are the source of truth for every UI change. This is a
frontend app: the code adapts to the design, never the other way round. Don't edit the design
files, and don't ask for the design to be changed to fit the code.

## Before every `git commit` that touches UI

1. Read the design for the task: the cited screen in `designs/` (file and id), the issue text,
   `docs/design-system.md`, and any plan/spec in `docs/` or `docs/superpowers/specs/`.
2. Compare the code to it strictly: layout, copy, fields, counts, states (loading, empty, error),
   tokens, and when the feature runs.
3. If it matches, say so in one line and commit.
4. If anything differs, **warn the user before committing**: list each difference (screen file and
   id, what the design shows, what the code does, and why). Don't commit until the user decides.
   The default fix is to change the code to match the design.
5. A difference is allowed only if the user explicitly approves it for this task. Record the
   approved difference in the commit message body.
6. If the design is missing, unclear, or doesn't cover a state (see `docs/design-system.md` §8–9),
   say so and ask. Don't invent visuals (`CLAUDE.md` §6).
