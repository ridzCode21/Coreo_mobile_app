# 044 - Profile screen with goal, pillars, sources, export and delete

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/44 |
| Type | enhancement |
| Size | big |
| Screens | 19a |
| Labels | enhancement, size:big, area:frontend |

## Summary
There is no profile screen, so users cannot see their summary, connected sources, or export and delete their data.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 19a.
"You" with an avatar initial and name, "With Coreo since March · Week 6", "The goal - 78 → 72 kg by October, without giving up your evenings.", rows for Diet, Fitness and Wellness (for example "Vegetarian · adaptive 1,960 kcal · carbs early"), the check-in style ("Steps in early / Plain words, no scores / Never red, never guilt"), "Connected: Apple Health · Strava · nothing else" with "Manage", and a link "What Coreo knows about me". Design lines 2508-2576. The phone row states (2577-2597) and phone verification (19c) are Phase 2.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `/users/profile/` is never called.

## What to change
- Build the screen from `GET /users/profile/`, the diet, fitness and wellness profiles, and `GET /integrations/sources/`.
- Add Export my data and Delete my data (`GET /users/me/data/export/`, `DELETE /users/me/data/`, `DELETE /users/me/`). They are in the MVP but not drawn in the design; ask the design owner where they go.
- Leave out the phone verification row (Phase 2).
- Some lines have no data: the goal's date ("by October") and sentence, "Week 6" (compute from the account date), and "adaptive" / "carbs early". Compose only what the data supports.

## Acceptance criteria
- [ ] The screen shows real profile data only.
- [ ] Export and delete work and ask for a clear confirmation.
- [ ] Connected sources come from the sources endpoint.

## Backend dependency
`GET /users/profile/`, profile reads, `GET /integrations/sources/` (no display sentence, so build it on the device) and the export and delete routes exist (API_REFERENCE §4, §5, §20). Open backend issue vipin4250/Self_dev#47 covers export and delete including AI data. Related existing issue: #58 "Profile screen shows live connected sources" (same repo as the backend, area:integrations); build the connected-sources row together with it and do not duplicate it. A goal date field does not exist.

## How to verify
Open the profile in live mode, export, and delete a test account.

## Definition of done (from the acceptance criteria)

- [ ] The screen shows real profile data only.
- [ ] Export and delete work and ask for a clear confirmation.
- [ ] Connected sources come from the sources endpoint.
