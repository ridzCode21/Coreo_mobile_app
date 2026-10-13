# 037 - Plan check screens: repaired and did not pass

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/37 |
| Type | enhancement |
| Size | small |
| Screens | 33a, 33b |
| Labels | enhancement, size:small, area:frontend |

## Summary
The design shows what happens when the plan check changes a meal or fails. The app has only a generic failure state.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 33a, 33b.
33a "Lunch didn't fit your shellfish note, so I swapped it for something that does. Nothing else changed." with an "Adjusted for you" chip on the changed meal and the hint "Tap Lunch to see what changed, or why." 33b "This one didn't quite balance. A couple of things clashed with your goals. Nothing logged, nothing lost." with "Rebuild the plan" and "Or adjust it myself". Design lines 3838-3907.

## Current behavior
- No code for either screen. The plan screen has a generic failed state and the 29a macro banner (see the plan states issue).

## What to change
- Build 33b for a plan that fails the check.
- Build 33a only when the backend says which meal was repaired and why.

## Acceptance criteria
- [ ] 33b shows the design copy and both actions.
- [ ] 33a is built only when the data exists.

## Backend dependency
Partly available: `validation_result.self_check_issues`, `violation_count` and `constraint_violation` exist. There is no per-meal "repaired" flag or reason, so 33a needs a backend issue.

## How to verify
Force a failed plan check in mock mode and compare with frame 33b.

## Definition of done (from the acceptance criteria)

- [ ] 33b shows the design copy and both actions.
- [ ] 33a is built only when the data exists.
