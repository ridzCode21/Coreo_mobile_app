# 032 - Full plan and meal detail screens match the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/32 |
| Type | enhancement |
| Size | big |
| Screens | 29a, 29b |
| Labels | enhancement, size:big, area:frontend |

## Summary
Both screens work but look and read differently from the design, and viewing a meal uses up recipe quota without the user asking.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 29a, 29b.
29a "Today's plan": banner "Macros landed a touch off today — still within range. Tomorrow adjusts, nothing repeats."; rows "Breakfast · 7:40 / Greek yogurt, berries" with states Logged (navy gradient with a pill), Next (white pill), Skipped (dimmed with a strikethrough), Planned (glass). 29b "Lunch · 12:30 / Rice bowl with paneer and greens", chips "20 min", "Moderate cost", "1 serving", a compact dark strip "640 kcal · P 32g · C 74g · F 22g", "Ingredients", a teaser "Recipe ready in 4 short steps." with "View recipe", and a bottom grid of tiles Log, Skip, Adjust, Replace, Feedback. Design lines 3350-3446.

## Current behavior
- `src/features/nutrition/screens/MealPlanScreen.tsx:131-185` (29a): the banner text joins `self_check_issues` or falls back without the second sentence (`:136-137`) and also shows when `macro_ok` is null (`:133`). Rows add "kcal · g protein" (`:157-159`). Every status except planned or missed is a solid ink row (`:143`, `:371`), including skipped, which should be dimmed. Status is plain small text, not a pill (`:161-163`). "Next" is missing. Extra: "Modified" and "Outside" labels (`:57-58`), a "Day total" label (`:169`) and a "Regenerate plan" button (`:178-185`). Totals weight differs (`:398`).
- `src/features/nutrition/screens/MealDetailScreen.tsx` (29b): header "Lunch · 640 kcal" (`:70-73`, `:201`); a dark hero card with a 30/200 title, a rationale text, four metric columns and a status line (`:211-224`) that renders "Logged As Planned · 1 Bowl" because of `textTransform: 'capitalize'` (`:734`). The info chips are missing (`prep_time_minutes`, `estimated_cost_tier`, `serving_size` exist in the data). The recipe is fetched and shown as soon as the screen opens (`:86`, `:281-300`); the first view of each meal spends a `recipe_generate` use (5 a day for free users). The actions (`:232-269`) are a full-width blue "Log as planned" and then Portion, Replace, Skip, Ate else, Feedback; the design has a bottom grid Log, Skip, Adjust, Replace, Feedback. A green status message (`:226-230`) is not in the design.

## What to change
- 29a: use the two-sentence banner copy; show it only when `macro_ok` is false; remove macros from rows; build the four row states (Logged, Next, Skipped, Planned); remove the extra labels and the Regenerate button (regenerate lives on the plan card, see the plan states issue).
- 29b: use the design header, hero strip and info chips; show a "View recipe" teaser and fetch the recipe only after the user taps it; use the bottom tile grid and the design labels.
- Remove the capitalized status text and the green message, or ask the owner if they should stay.

## Acceptance criteria
- [ ] 29a and 29b match the design copy, order and row states.
- [ ] Opening a meal does not fetch a recipe; tapping "View recipe" does.
- [ ] No quota is used by only looking at a meal.

## Backend dependency
Meal times ("7:40", "12:30") are not in the API; leave them out or add a backend issue for a time field. Everything else exists (API_REFERENCE §12 and §13).

## How to verify
Open a plan with logged, skipped and planned meals and compare with frames 29a and 29b; check the network log for recipe calls.

## Definition of done (from the acceptance criteria)

- [ ] 29a and 29b match the design copy, order and row states.
- [ ] Opening a meal does not fetch a recipe; tapping "View recipe" does.
- [ ] No quota is used by only looking at a meal.
