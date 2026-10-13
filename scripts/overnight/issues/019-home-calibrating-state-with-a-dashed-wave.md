# 019 - Home calibrating state with a dashed wave

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/19 |
| Type | enhancement |
| Size | big |
| Screens | 10b |
| Labels | enhancement, size:big, area:frontend |

## Summary
The app never shows the "still reading you" home state. The backend already tells the app which calibration day it is, but the app ignores it.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 10b.
Headline "Welcome in, **{name}.**" "Still reading you. The wave stays dashed until day 4." A grey card "Calibrating" with an all-dashed wave (dash 3 7, no dot), labels "Day 1" and "Real by day 4". A "Reading you" list of connected sources, for example "Apple Health — 214 nights of sleep in" and "Strava — live, syncing now". "While I read, go meet your pillars." Petal sub-labels "30 sec to set up" and "Ready". Design lines 686-771.

## Current behavior
- No home state for calibration. `src/features/onboarding/screens/CalibratingScreen.tsx:26,58-60` is an old onboarding screen that shows "{percent}% calibrated" from how complete the diet profile is.
- `src/shared/types/dietProfile.ts:76-98` has no `calibration_day`, `calibration_complete`, `wave` or `active_pillars`, which the API returns (API_REFERENCE §5).
- `src/shared/components/WaveChart.tsx:72-78,142-165` always draws a solid part and a glowing dot; its dash is `5,7` at .45 and stroke 2.5 (`:135-139`); the design "dashedOnly" mode is `3 7` at .35, stroke 2, no dot (design lines 4291-4292).
- `GET /integrations/sources/` is never called.

## What to change
- Add the calibration fields to the DietProfile type and mock.
- Show this home state while the wave is dashed (days 1-3) and the solid state from day 4.
- Teach `WaveChart` a dashed-only mode with no dot.
- Show the "Reading you" list from `GET /integrations/sources/`. The backend gives only connected and last-synced values, so write the sentence on the device and do not show counts like "214 nights".

## Acceptance criteria
- [ ] Days 1-3 show the calibrating home with a dashed wave and no number.
- [ ] From day 4 the solid home appears.
- [ ] The sources list uses only data the API returns.

## Backend dependency
`calibration_day` and `wave` exist (API_REFERENCE §5, backend issue vipin4250/Self_dev#24 closed). `GET /integrations/sources/` exists (§20). The "214 nights" sentence is not provided and must be dropped or built from data the API gives.

## How to verify
In mock mode set calibration day 1, 3 and 4 and check the three states against frame 10b.

## Definition of done (from the acceptance criteria)

- [ ] Days 1-3 show the calibrating home with a dashed wave and no number.
- [ ] From day 4 the solid home appears.
- [ ] The sources list uses only data the API returns.
