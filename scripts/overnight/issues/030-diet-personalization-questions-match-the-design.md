# 030 - Diet personalization questions match the design copy and options

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/30 |
| Type | enhancement |
| Size | big |
| Screens | 12a·1, 12a·2, 12a·3, 12a·4, 12a·5, 12a·6 |
| Labels | enhancement, size:big, area:frontend |

## Summary
The signed-in diet questions use different titles, options and buttons than the design. Two design questions (target weight, weak moment) cannot be answered in the app at all.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 12a·1, 12a·2, 12a·3, 12a·4, 12a·5, 12a·6.
12a·1 "How do you eat?" (Vegetarian, Vegan, Everything, No beef, Halal, Eggs are fine, Pescatarian, Jain, No pork). 12a·2 "Anything your body refuses? I never suggest what hurts you." (Peanuts, Dairy, Gluten, Shellfish, Soy, Nothing). 12a·3 "You're at 78 kg. Where are we taking it?" with a target slider and pace "Gently / Steady / Push me", button "72, steady". 12a·4 "Who makes your food most days?" (I cook, Family cooks, House help, Mostly order in, Office canteen) with "The plan bends to whoever is at the stove, not the other way." 12a·5 "How does a normal day of eating flow?" (Two big meals, Three meals, Three plus snacks, Grazing all day, No pattern) with "Meal timing shapes the plan more than calorie math does." 12a·6 "Last one. When do you slip? I'll guard that hour with you." (Skipping meals, Late-night snacks, Ordering out, Stress eating, Weekends, Sugar), button "Build my fuel plan". Design lines 974-1223.

## Current behavior
- Questions live in `src/features/nutrition/components/DietPersonalizationCard.tsx` (quick card `:173-268`, edit sheet `:383-455`). This is intentional in the v3 plan (`docs/feature-map.md`).
- 12a·1 title is "How do you usually eat?" (`:182`, `:368`). Options (`:27-35`) are Vegetarian, Vegan, Non-veg, Eggs are fine, Jain, Keto, Low carb. The edit sheet uses radio rows (`:410-416`), the design uses pills.
- 12a·2 title is "Anything we should avoid?" (`:211`, `:370`). The first chip is "No allergies" (`:214`, `:354`); the design has "Nothing" last.
- 12a·3: `target_weight_kg` cannot be edited anywhere (`EditableSection` excludes goal and body at `:85`, `:96`).
- 12a·4 options (`:56-59`) are four cooking-frequency answers; the subtitle is missing; the button says "Save" (`:449`).
- 12a·5 has three options (`:62-66`); the subtitle and the last two options are missing; the button says "Save".
- 12a·6 is not in the app. `src/features/onboarding/lib/dietQuestions.ts` and `DietQuestionScreen.tsx` hold an old version of these questions that nothing uses (only `GOAL_TYPE_LABEL` from that file is used).

## What to change
- Change titles, subtitles and button labels to the design copy.
- Use options that exist as backend values. Where the design option has no backend value, see the backend dependency below; do not invent values.
- Add the target weight question using `target_weight_kg` and the current weight.
- Add the weak moment question using `weak_moment` (six values); picking late-night snacks turns on the late-night guard on the backend.
- Delete the unused `DIET_QUESTIONS` config or reuse it, and update `docs/feature-map.md` D10, which says weak moment has "no API field".
- Confirm with the owner which intentional v3 choices stay (bundled quick card, no free-text "Or just tell me").

## Acceptance criteria
- [ ] Titles, subtitles, buttons and chip lists match the design wherever a backend value exists.
- [ ] Target weight and weak moment can be answered and saved with a partial `PUT /users/me/diet-profile/`.
- [ ] No dead question config remains.

## Backend dependency
Exists: `weak_moment` (API_REFERENCE §5, lines 353 and 398; enum line 1656), `target_weight_kg`, `eating_pattern` (enum line 1647), `meal_frequency` (integer). Missing: diet types "No beef", "Halal", "Pescatarian", "No pork" (enum `DietType`, line 1638 only has vegetarian, vegan, non_veg, eggetarian, jain, keto, low_carb) and a pace field ("Gently / Steady / Push me"). These need a backend issue before the pills can be built.

## How to verify
Open Diet, answer each question, check the saved profile in the API, and compare with frames 12a·1 to 12a·6.

## Definition of done (from the acceptance criteria)

- [ ] Titles, subtitles, buttons and chip lists match the design wherever a backend value exists.
- [ ] Target weight and weak moment can be answered and saved with a partial `PUT /users/me/diet-profile/`.
- [ ] No dead question config remains.
