# 046 - Evening check-in: the 20-second ritual

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/46 |
| Type | enhancement |
| Size | big |
| Screens | 24a, 24a tomorrow previewed |
| Labels | enhancement, size:big, area:frontend |

## Summary
The in-app evening check-in does not exist. The backend can only record the Good or Rough answer to a notification.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 24a, 24a tomorrow previewed.
"Evening check-in · 20 seconds - How did today feel?" with a five-point scale (Rough, Meh, Okay, Good, Great), "Looks right?" with three recap facts ("7,904 steps", "Lunch logged · rice bowl", "No session — moved to Thursday") and "Fix something", a note "Anything for tomorrow-me?", and the button "Close the day". Then "Tomorrow, previewed - Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here." and "Good night". Design lines 2741-2798.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `colors.evening` in `src/shared/theme/tokens.ts:21` is only a colour.

## What to change
- Build the screen once the backend can store the check-in. The recap can be built from `GET /daily-summary/` and the training week.
- Agree the answer scale first: the design has five values, the backend and the lock screen have two (good, rough).

## Acceptance criteria
- [ ] The screen matches the design once the backend exists.
- [ ] The recap uses real data only.
- [ ] The answer is saved and the preview shows what the backend returns.

## Backend dependency
Blocked. No endpoint stores an in-app mood, the "tomorrow-me" note or a closed day, and none returns the tomorrow preview. `docs/mvp.md` says the in-app ritual is not started. Backend issue vipin4250/Self_dev#51 (open, "Evening check-in: the 20-second daily ritual") covers this. The notification answer route accepts only good and rough (API_REFERENCE §5, lines 855-863).

## How to verify
When vipin4250/Self_dev#51 ships: submit a check-in and open the preview. Until then this issue stays blocked.

## Definition of done (from the acceptance criteria)

- [ ] The screen matches the design once the backend exists.
- [ ] The recap uses real data only.
- [ ] The answer is saved and the preview shows what the backend returns.
