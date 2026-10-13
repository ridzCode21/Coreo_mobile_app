# 018 - Home wave, score and the one nudge

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/18 |
| Type | enhancement |
| Size | big |
| Screens | 10a, 24b, 23a |
| Labels | enhancement, size:big, area:frontend |

## Summary
The big "Today" card with the score and wave, and the "Your core · Now" nudge, are missing from home. Some of the data they need does not exist in the backend yet.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 10a, 24b, 23a.
A night-glass "Today" card (radius 28) with a dot-matrix score, a wave (solid for the past, dashed for the future, a white "now" dot) and the axis Morning / Now / Evening. A nudge card "Your core · Now": "Eat carbs in the next hour and tonight's session will feel easy." An "Ask me anything" bar with a mic and a send button. Design lines 82-159 and 627-685.

## Current behavior
- `CoreoHomeScreen.tsx:107-130` shows a plain card with Nutrition, Movement and Hydration rows. `WaveChart` is not imported there (`:5-8`).
- There is no nudge card and no "Ask me anything" bar.

## What to change
- Build the Today card and the nudge card with the design layout, using real data only. Where a value does not exist, show the dashed state; never an invented number.
- Add the "Ask me anything" bar and connect it to the chat screen when that exists.
- Open backend issues for the missing data (below) and link them here.

## Acceptance criteria
- [ ] Cards match the design for the data that exists.
- [ ] No number or wave point is made up.
- [ ] Missing data is listed as backend issues and linked.

## Backend dependency
No endpoint exists for the Core Index score, the one-line nudge text, the "ahead of yesterday" comparison, or intraday wave points (`/daily-summary/` gives daily totals only, API_REFERENCE §10). `GET /users/me/right-now/` is only the heart-rate breath. Related backend work: vipin4250/Self_dev#44 (the one nudge) and vipin4250/Self_dev#24 (home dashed until calibration day 4, closed). A new backend issue is needed for the score and wave points.

## How to verify
Compare home with frames 10a/24b once data exists; with no data, check the card is dashed and shows no numbers.

## Definition of done (from the acceptance criteria)

- [ ] Cards match the design for the data that exists.
- [ ] No number or wave point is made up.
- [ ] Missing data is listed as backend issues and linked.
