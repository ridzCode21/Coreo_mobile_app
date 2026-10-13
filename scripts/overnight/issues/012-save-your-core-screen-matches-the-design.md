# 012 - Save your core screen matches the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/12 |
| Type | enhancement |
| Size | small |
| Screens | 8a |
| Labels | enhancement, size:small, area:frontend |

## Summary
The save screen is close to the design but has a wrong summary line, a missing wave icon, and the email option is built differently.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 8a.
Title "Save me, so I don't forget you." Summary card "{name} · Lose weight · Diet" with a wave icon. Buttons: Continue with Apple, Continue with Google, and a link "Use email instead" that opens the Create account screen (8e). Label "Almost there". Privacy note card radius 14, padding 10/14. Design lines 365-396.

## Current behavior
- `src/features/onboarding/screens/SaveScreen.tsx:34-46` lowercases the goal and the pillar names and joins pillars with " + ". The wave icon is missing.
- "Use email instead" expands a form in place and the link then reads "Use Apple or Google instead" (`:280-290`). The design opens a separate screen (8e).
- Google label colour is `ink60` (.62) at `:451`; design is rgba(23,25,29,.8). The email link is 12.5/300 at .62 (`:459-460`); design is 12/400 at .55. Privacy card radius is `radii.sm` 15 and padding 12 (`:521-522`); design is 14 and 10/14.
- The Apple button (`:257-267`) is in the design, but Sign in with Apple is Phase 2 in the backend `docs/mvp.md`.

## What to change
- Build the summary line as in the design (name · goal label · pillar names in title case) and add the wave icon.
- Open the Create account screen from "Use email instead" (see the "Create account and sign in screens" issue) and remove the in-place form.
- Match the Google label, email link and privacy card tokens.
- Apple button: ask the owner whether to hide it until Phase 2 (design shows it, `docs/mvp.md` parks it). Do not make the button call a fake sign in.

## Acceptance criteria
- [ ] Summary line and icon match the design.
- [ ] "Use email instead" navigates to the Create account screen.
- [ ] Text styles and card sizes match the design.
- [ ] Apple button decision is recorded in the PR.

## Backend dependency
None for this screen. Sign in with Apple is Phase 2 (`docs/mvp.md`).

## How to verify
Finish the interview and compare the save screen with frame 8a.

## Definition of done (from the acceptance criteria)

- [ ] Summary line and icon match the design.
- [ ] "Use email instead" navigates to the Create account screen.
- [ ] Text styles and card sizes match the design.
- [ ] Apple button decision is recorded in the PR.
