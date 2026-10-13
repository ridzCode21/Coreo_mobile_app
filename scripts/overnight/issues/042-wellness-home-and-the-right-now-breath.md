# 042 - Wellness home and the Right now breath

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/42 |
| Type | enhancement |
| Size | big |
| Screens | 17b, 17c |
| Labels | enhancement, size:big, area:frontend |

## Summary
The Wellness tab is a placeholder. The backend already returns tonight's wind-down and a breath when the heart rate spikes.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 17b, 17c.
17b "Wellness - 9:12 PM - Your day ran hot. Tonight we land it early." A wind-down card "Lights out 10:45" with timed steps and a reason under each, "One routine… No library to scroll.", "Why tonight matters", and the buttons "Start the wind-down" and "Something on your mind? Say it". 17c "Right now - Your heart's been running for twenty minutes. Let's slow it together." A "Breathe out" cue, "In for 4 · hold for 7 · out for 8", "Nothing to pick. Just this, six times.", buttons "Not now" and "I'm here". Design lines 2349-2449.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing.

## What to change
- Build 17b from `GET /users/me/wind-down/`. When it returns null, send the user to the Wellness interview.
- Build 17c from `GET /users/me/right-now/`. It only returns a breath above a stored heart rate; show nothing otherwise. Never show the heart rate number (the design does not).
- There is no push for 17c; check on app open and when returning to the foreground. Ask the owner about the entry point.
- "Start the wind-down" has no flow or endpoint. Ask the design owner for the guided screen before building it.

## Acceptance criteria
- [ ] 17b shows tonight's plan from the API and plain words when numbers are hidden.
- [ ] 17c appears only when the API returns a breath.
- [ ] No invented numbers.

## Backend dependency
`GET /users/me/wind-down/` and `GET /users/me/right-now/` exist (API_REFERENCE §5, lines 572-669; backend issues vipin4250/Self_dev#28 and vipin4250/Self_dev#29, closed). Live heart-rate triggers are backend issue vipin4250/Self_dev#55 (Phase 2).

## How to verify
Use mock data with a wind-down and with a breath, and compare with frames 17b and 17c.

## Definition of done (from the acceptance criteria)

- [ ] 17b shows tonight's plan from the API and plain words when numbers are hidden.
- [ ] 17c appears only when the API returns a breath.
- [ ] No invented numbers.
