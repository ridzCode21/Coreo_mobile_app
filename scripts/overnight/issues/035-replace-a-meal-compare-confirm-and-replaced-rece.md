# 035 - Replace a meal: compare, confirm and replaced receipt

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/35 |
| Type | bug |
| Size | big |
| Screens | 30a, 30b, 35a, 35b |
| Labels | bug, size:big, area:frontend |

## Summary
After a successful swap the user lands on "Meal not found". The two-step flow in the design (pick, then confirm with a countdown) is missing, and old swap options can come back.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 30a, 30b, 35a, 35b.
30a "Swap dinner? Tell me what you'd rather have, or just pick one." (input "e.g. something with less rice", a dark glass input with a round send button; options with a radio, name, kcal). 35a full screen "Swap dinner - Three that fit tonight — pick one, or keep what's planned." with cards (full macros, a "why it fits" line, "Use this one") and the footer "Only one can be used — the rest fall away." 30b "Confirm the swap" with "Replacing dinner", "Expires in 8:42", the new meal, "610 kcal · +40 vs original · 8g less carbs", "Confirm swap" and "Choose a different one". 35b "Dinner · 7:30 - Replaced" with the new meal and macros. Design lines 3502-3567, 3944-4015.

## Current behavior
- `src/features/nutrition/screens/MealDetailScreen.tsx`: after confirm, `confirmReplacement` (`:150-160`) only shows a message; it ignores the returned `meal_id` (`:159`). The plan is refetched, the API no longer returns the replaced meal (API_REFERENCE §12, lines 1410-1411), the lookup at `:82-85` finds nothing, and the screen shows "Meal not found / This item may have been replaced…" (`:302-308`).
- `closeSheet` (`:117-120`) never resets the replace preview, so reopening Replace shows the old options and a "Use this swap" button with a token that can be past its 600 second life (`:326`). There is no error handling for a 404 `preview_not_found` or a 503.
- The sheet (`:454-521`) has the title "Swap this meal", body "Tell me what would fit better, or leave it open.", placeholder "e.g. no dairy, less cooking, more protein", a light input and a separate "Show swaps" button (`:488-494`, `:515`), and rows with name and "kcal · g protein" only (`:506-509`). There is no confirm step, no countdown and no 35a screen.

## What to change
- Fix the bug first: after confirm, open the new meal (use the returned `meal_id`) or go back to the plan, and show the 35b receipt.
- Reset the preview when the sheet closes and handle `preview_not_found` and 503 with calm copy.
- Build the 30a sheet copy, the 35a compare screen, and the 30b confirm step with a countdown computed from the 10-minute life (the response has no expiry time).
- Show the delta line from the two meals' values.

## Acceptance criteria
- [ ] A successful swap never shows "Meal not found".
- [ ] Reopening the sheet starts clean.
- [ ] An expired preview shows a clear message and a way to try again.
- [ ] 30a, 35a, 30b and 35b match the design copy.

## Backend dependency
The preview and confirm routes exist (API_REFERENCE §13, lines 1483-1503). Not available: the original meal and the swap reason after a swap ("Replaced Grilled fish, roti, sabzi — swapped for a closer macro match." and "View the original", design lines 4004-4006). `GET /meal-plans/{date}/` leaves replaced meals out and nothing returns the old one. Needs a backend issue; the "reason line" under each alternative also needs a backend check, because the documented alternative has no reason field (lines 1489-1491).

## How to verify
Swap a meal in live mode, confirm, and check you land on the replaced meal. Reopen Replace after closing it.

## Definition of done (from the acceptance criteria)

- [ ] A successful swap never shows "Meal not found".
- [ ] Reopening the sheet starts clean.
- [ ] An expired preview shows a clear message and a way to try again.
- [ ] 30a, 35a, 30b and 35b match the design copy.
