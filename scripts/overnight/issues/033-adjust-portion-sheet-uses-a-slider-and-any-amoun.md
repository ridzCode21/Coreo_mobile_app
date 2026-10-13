# 033 - Adjust portion sheet uses a slider and any amount

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/33 |
| Type | bug |
| Size | small |
| Screens | 29c, 36a |
| Labels | bug, size:small, area:frontend |

## Summary
The portion sheet has four preset buttons, one of them mislabelled, and tells the user the meal was logged when it was only rescaled.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 29c, 36a.
29c "Adjust the portion - Same meal, more or less of it." A big "1.4x" readout, a slider from 0.5x to 2x and a live line "≈ 896 kcal · 45g protein · 12g fat", button "Save portion". 36a "Same meal — half, double, or any amount you like." slider 0.25x to 3x, "Or type your own amount", and "About 900 kcal · roughly 45g protein, 60g carbs, 12g fat". Design lines 3447-3472 and 4016-4049.

## Current behavior
- `src/features/nutrition/screens/MealDetailScreen.tsx:417-451` has the title "How much did you have?" and the body "Update the portion and I will log the adjusted meal." Presets are Less 0.75, As planned 1, More 1.25 and "Double" 1.5 (`:43-48`), so "Double" is wrong. The value always starts at 1 (`:96`) instead of the meal's `portion_multiplier`. The success message "Portion updated and logged." (`:146`) is wrong because adjust-quantity only rescales the meal. The button "Save portion" (`:449`) matches.

## What to change
- Use the design title, body and slider with a big readout, and the "type your own amount" field (the API accepts any number from 0.01).
- Show the live estimate from the meal's base values.
- Start from the meal's current multiplier.
- Fix the success message to say the portion was updated.

## Acceptance criteria
- [ ] The slider replaces the preset buttons.
- [ ] The estimate updates as the slider moves.
- [ ] A typed amount works.
- [ ] The success text does not say "logged".

## Backend dependency
`POST /meal-plans/{date}/meals/{meal_id}/adjust-quantity/` exists (API_REFERENCE §13).

## How to verify
Open a meal, adjust the portion to 1.4x and to a typed value, and compare with frames 29c and 36a.

## Definition of done (from the acceptance criteria)

- [ ] The slider replaces the preset buttons.
- [ ] The estimate updates as the slider moves.
- [ ] A typed amount works.
- [ ] The success text does not say "logged".
