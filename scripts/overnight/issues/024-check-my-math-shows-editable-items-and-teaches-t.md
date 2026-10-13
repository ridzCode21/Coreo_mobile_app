# 024 - Check my math shows editable items and teaches the backend

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/24 |
| Type | enhancement |
| Size | small |
| Screens | 15a |
| Labels | enhancement, size:small, area:frontend |

## Summary
After a photo the design shows each food as a row you can nudge or fix. The app shows a single form. The backend already returns the items and learns from corrections, but the app throws that away.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 15a.
"Logged · Lunch" then "Here's what I saw. **Check my math.**" A dark summary card with the meal name, 640 kcal and "P 32g · C 74g · F 22g, every line below is editable". Rows such as "Steamed rice - 1 cup · 205 kcal" with − and + steppers. A "Fix" action on guessed items and "From your fix last time" on remembered ones. Footer: "Correct me once. I never make the same mistake twice." A back chevron. Design lines 1365-1432.

## Current behavior
- `src/features/nutrition/screens/ConfirmMealScreen.tsx` has one text field, meal chips and four macro inputs (`:125-191`), a single headline string (`:113`), a `coreBlue` gradient button (`:202-213`) and a "Not now" link (`:216-218`). The eyebrow uses the clock meal (`:122`) even if the user picks another chip.
- `PhotoEstimate` (`src/shared/types/food.ts:60-67`) and the mock (`src/features/nutrition/mocks/handlers.ts:227-237`) drop the `items[]` the API returns (`portion_label`, `guessed`, `guess_note`, `remembered`; API_REFERENCE §8, lines 1131-1149).
- The save request (`src/features/nutrition/api/nutritionApi.ts:113-122`) never sends `ai_guess`, so the server cannot learn corrections.
- The comment at `ConfirmMealScreen.tsx:64-66` says the ingredient breakdown "needs a backend change"; that is out of date.

## What to change
- Keep and type the `items[]` from the photo response.
- Build the design layout: back chevron, dark summary card, item rows with steppers, "Fix", the "remembered" tag and the footer line.
- Send `ai_guess` with the saved entry so corrections are learned.
- Use the chosen meal in the eyebrow; use the design button.
- Update the mock and delete the stale comment.

## Acceptance criteria
- [ ] Photo results show per-item rows that can be changed.
- [ ] `ai_guess` is sent on save.
- [ ] Copy and layout match frame 15a.
- [ ] Manual entry (no photo) still works.

## Backend dependency
`POST /food/photo/` returns `items[]` and `POST /food/entries/` accepts `ai_guess` (API_REFERENCE §8; backend issue vipin4250/Self_dev#4, closed).

## How to verify
Photograph a meal in live mode, change one item, save, then log the same meal again and check the item is remembered.

## Definition of done (from the acceptance criteria)

- [ ] Photo results show per-item rows that can be changed.
- [ ] `ai_guess` is sent on save.
- [ ] Copy and layout match frame 15a.
- [ ] Manual entry (no photo) still works.
