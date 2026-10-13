# 022 - Diet home matches the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/22 |
| Type | enhancement |
| Size | small |
| Screens | 14a |
| Labels | enhancement, size:small, area:frontend |

## Summary
The Diet home has the right idea but a different headline, a different macro card style, a missing weight chip, and two error states that mislead.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 14a.
Headline "Carbs before 5. That's the whole game today." (25px, weight 200 with a 400 part). A chip "78 → 72" (current to target weight) with a back chevron. Card "Left today" with the corner label "Adjusts as I learn you", a 38px/200 kcal number, macro bars in white with a soft glow. A "Next meal · before 1 PM" card. A calm strip "Went over yesterday? Nothing turns red here. I adjust, we move on." A white "Log a meal" pill (13.5/500, 58px high, black 42px plus button) and a dark voice bar "Say what you ate. Five seconds". Design lines 1224-1295.

## Current behavior
- `src/features/nutrition/screens/DietHomeScreen.tsx:70` headline is "Your fuel, **kept honest.**" (`pageTitle` 34px, accent weight 500 at `:160`).
- No back chevron or weight chip. The comment at `:36-37` says the chip is "not here yet", but `weight_kg` and `target_weight_kg` exist in `src/shared/types/dietProfile.ts:79-80`.
- `MacroSummaryCard.tsx:66-68` shows a quality badge (Starter, Estimated, Confirmed) instead of "Adjusts as I learn you". The kcal number uses the 78px `display` style (`:124-126`). Bar fill is `rgba(255,255,255,0.6)` with no glow (`:25`).
- The "Next meal" card is replaced by `MealPlanCard` (`:93`). The reassurance strip and the voice bar are missing.
- The log pill (`:187-211`) is `rgba(255,255,255,.62)`, 15/300 text and a 44px `coreBlue` plus button, with no fixed height.
- Errors: the profile error says "Pull to refresh in a moment." (`:89`) but no `RefreshControl` exists in `src/features/nutrition` or `src/shared/components`. A failed entries request is not handled and shows "Nothing logged yet..." (`:52`, `:96-98`).
- Extra blocks the design does not show: the diet personalization card (`:79`) and a list of today's entries with "Remove" buttons (`:95-114`, `FoodEntryRow.tsx:33-39`).

## What to change
- Use the design headline and weights; add the back chevron and the "78 → 72" chip from the diet profile.
- Change the card label, kcal number size and bar style to the design (white fill with glow).
- Add the "Next meal" card, the "Nothing turns red here" strip and the voice bar.
- Restyle the Log a meal pill (white glass, 13.5/500, 58px, black 42px plus).
- Add real pull to refresh, and a calm error state for entries that does not claim "Nothing logged yet".
- Ask the owner where the personalization card and the entries list should live, since the design does not show them.

## Acceptance criteria
- [ ] Headline, chip, card label and number size match the design.
- [ ] Bars and the log pill match the design.
- [ ] Pull to refresh works; an entries error is shown as an error.
- [ ] No red is used.

## Backend dependency
None. `GET /daily-summary/` and the diet profile are enough.

## How to verify
Open Diet on a phone and compare with frame 14a; switch the mock to return an entries error and a profile error.

## Definition of done (from the acceptance criteria)

- [ ] Headline, chip, card label and number size match the design.
- [ ] Bars and the log pill match the design.
- [ ] Pull to refresh works; an entries error is shown as an error.
- [ ] No red is used.
