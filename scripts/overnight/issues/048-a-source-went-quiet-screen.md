# 048 - A source went quiet screen

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/48 |
| Type | enhancement |
| Size | small |
| Screens | 25b |
| Labels | enhancement, size:small, area:frontend |

## Summary
The app never tells the user when a data source stops syncing.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 25b.
"Sources - Whoop stopped talking to me. Last synced yesterday, 11:40 PM. Today I'm working from Apple Health alone, so sleep depth is an estimate — and I've labeled it that way." Buttons "Reconnect Whoop" and "Remind me later", a "Last night" card with Sleep "6h 40m" tagged "Estimate", and "Connected: Apple Health · active — Whoop · quiet". Design lines 2848-2892.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `GET /integrations/sources/` is never called.

## What to change
- Build the screen for Apple Health, Health Connect and Strava (Whoop is Phase 2 in `docs/mvp.md`).
- Decide with the backend what "quiet" means; the API gives only `last_synced_at` (Strava has none), so the app must pick a threshold. Do not claim "estimate" or "recovery" values the API does not provide.
- "Reconnect" for Apple Health and Health Connect is a phone permission screen, not an API call.

## Acceptance criteria
- [ ] The screen uses only values from the sources endpoint.
- [ ] Reconnect opens the right permission or sign in flow.
- [ ] Nothing mentions Whoop.

## Backend dependency
`GET /integrations/sources/` exists (API_REFERENCE §20, lines 1776-1813; backend issue vipin4250/Self_dev#17, closed). Missing: a "quiet" flag, a sleep estimate marker and a recovery value. Related existing issues: #57 "Onboarding sources screen for Apple Health, Health Connect, and Strava", #58 "Profile screen shows live connected sources", #59 "Explain HealthKit, Health Connect, and Strava permission prompts", and open backend work #54, #55, #56 and vipin4250/Self_dev#53. Do not duplicate those screens.

## How to verify
Use the mock with an old last-synced time and compare with frame 25b.

## Definition of done (from the acceptance criteria)

- [ ] The screen uses only values from the sources endpoint.
- [ ] Reconnect opens the right permission or sign in flow.
- [ ] Nothing mentions Whoop.
