# 040 - Fitness home and this week's loop

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/40 |
| Type | enhancement |
| Size | big |
| Screens | 16b, 16c |
| Labels | enhancement, size:big, area:frontend |

## Summary
The Fitness tab shows a "coming soon" card. The backend already builds a training week from the interview.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 16b, 16c.
16b "Fitness - Week 3 · Day 2", the coach line "Legs are still paying for Monday. Today we push.", a "Today's session" card ("45 min · dumbbells", the session name, rows like "Dumbbell bench press - 4 x 8 · 22.5 kg"), a progression line, "Why today is lighter", and the buttons "Start session" and "Already moved today? Tell me". 16c "This week's loop - Your week, built from what you told me." with session rows, a sport row ("Cricket counts"), the footer and a "Swap a session" button. Design lines 2015-2148.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. The Fitness tab is `PillarComingSoonScreen`.

## What to change
- Build 16b and 16c from `GET /users/me/training-week/`: position label, today's session, exercises with sets, reps and weight, `progression_note` and `lighter_note`. Handle a rest day (`today: null`) and a missing interview (send the user to the interview).
- "Start session" should mark sets done with `POST /users/me/training-week/sets/`. The in-session screen is not designed; ask the design owner.
- Leave out the "Swap a session" button and "800+ movements" wording: swapping sessions and the big library are Phase 2 in `docs/mvp.md`.
- The coach headline is not in the API payload. Do not make it up; show the session name until the backend provides it.

## Acceptance criteria
- [ ] 16b and 16c show only data from the API.
- [ ] A rest day and a missing interview have a calm state.
- [ ] Marking a set done is saved.
- [ ] No Phase 2 control is shown.

## Backend dependency
`GET /users/me/training-week/` and `POST .../sets/` exist (API_REFERENCE §5, lines 476-527; backend issue vipin4250/Self_dev#27, closed). Missing: the coach headline text and a weekday for each session. Session swapping is backend issue vipin4250/Self_dev#54 (Phase 2).

## How to verify
Complete the Fitness interview in live mode, open the tab, and compare with frames 16b and 16c.

## Definition of done (from the acceptance criteria)

- [ ] 16b and 16c show only data from the API.
- [ ] A rest day and a missing interview have a calm state.
- [ ] Marking a set done is saved.
- [ ] No Phase 2 control is shown.
