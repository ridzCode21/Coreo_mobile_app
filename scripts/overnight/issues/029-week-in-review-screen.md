# 029 - Week in review screen

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/29 |
| Type | enhancement |
| Size | small |
| Screens | 15c |
| Labels | enhancement, size:small, area:frontend |

## Summary
The weekly review is part of the MVP and the backend produces it, but the app has no screen for it.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 15c.
"Week in review - Sep 28 – Oct 4 - **It's working.** Protein up, weight following." "Days near target" for Mon to Sun, a plain sentence about patterns, "This week's call", and the recommendation. Sheet gradient #A3C4E5 to #54779F. Design lines 1494-1561.

## Current behavior
- No code calls `GET /insights/weekly-diet-review/`.

## What to change
- Add the query and the screen with `headline`, `subtitle`, `adherence_line`, `pattern_callout`, `recommendation`, `days[7]` and `target_changes`.
- Handle the 404 `no_review` case with a calm empty state.
- Decide the entry point (Diet home) with the owner.

## Acceptance criteria
- [ ] The screen shows only values returned by the API.
- [ ] A 404 shows a calm empty state.
- [ ] No red; copy matches the design.

## Backend dependency
`GET /insights/weekly-diet-review/` exists (API_REFERENCE §10, line 1282; backend issue vipin4250/Self_dev#3, closed).

## How to verify
Open the screen on a dev account with a full week of logs and compare with frame 15c.

## Definition of done (from the acceptance criteria)

- [ ] The screen shows only values returned by the API.
- [ ] A 404 shows a calm empty state.
- [ ] No red; copy matches the design.
