# 028 - Your usuals screen

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/28 |
| Type | enhancement |
| Size | small |
| Screens | 15b |
| Labels | enhancement, size:small, area:frontend |

## Summary
The app never suggests the meals you repeat. The backend already works this out.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 15b.
"Your usuals - 8:40 on a Tuesday. **The usual?**" Three suggestion rows, for example "Poha with peanuts + chai - Most weekday mornings · 380 kcal", "Yesterday's breakfast again", a footer line and a "Something new instead" link. Design lines 1433-1493.

## Current behavior
- No code calls `GET /food/usuals/` (food calls are only in `src/features/nutrition/api/nutritionApi.ts`).

## What to change
- Add the usuals query and the 15b screen with `suggestions[]` (`reason_label`, `food_name`, `calories`).
- Confirming a suggestion saves an entry with source `quick_add` (add it to `FoodSource`).
- Show nothing (or the design empty case) when there are no suggestions.

## Acceptance criteria
- [ ] Suggestions come from the API and are not made up.
- [ ] Tapping one logs it as `quick_add`.
- [ ] "Something new instead" opens the log sheet.

## Backend dependency
`GET /food/usuals/` exists (API_REFERENCE §8, lines 1034-1080; backend issue vipin4250/Self_dev#2, closed).

## How to verify
Log breakfast for a few days in the dev server, then open the screen and compare with frame 15b.

## Definition of done (from the acceptance criteria)

- [ ] Suggestions come from the API and are not made up.
- [ ] Tapping one logs it as `quick_add`.
- [ ] "Something new instead" opens the log sheet.
