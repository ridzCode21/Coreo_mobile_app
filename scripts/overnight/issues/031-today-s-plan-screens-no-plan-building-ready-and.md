# 031 - Today's plan screens: no plan, building, ready and could not build

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/31 |
| Type | enhancement |
| Size | big |
| Screens | 28a, 28b, 28c, 28d |
| Labels | enhancement, size:big, area:frontend |

## Summary
The four "Today's plan" states are built as cards inside Diet home, with different copy, a dark look, and without the building checklist, the "Left today" card and the regenerate button.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 28a, 28b, 28c, 28d.
28a "Let's build today's plate. One tap, and I fit it to you." with a "Generate today's plan" button and a "Day 6" pill. 28b "Building today's plate…" "Give me a few seconds. I check the math twice." with a checklist (Reading your usuals, Balancing your macros, Double-checking it adds up) and "This won't count against today until it's ready." 28c "Carbs early, protein steady — here's the shape of it." with a "Left today" card (kcal plus Protein, Carbs, Fat), meal rows in one glass container ("Lunch · 12:30 · Next up", logged rows dimmed with a check), quick chips ("Make it lighter", "Swap dinner", "I'm not hungry today"), a white "See full plan" button and a black round regenerate button. 28d "Couldn't build today's plate. Nothing logged, nothing lost. Let's just try that again." with "Try again" and "Or log meals yourself for now". Design lines 3186-3349.

## Current behavior
- `src/features/nutrition/components/MealPlanCard.tsx` is shown on Diet home (`DietHomeScreen.tsx:93`). The no-plan, building and failed states use a dark night card (`:118`); a plan that is ready uses the light card.
- 28a (`:194-211`): title "Let's build today's plate." (`:196`) and a separate body "One tap, and I fit it to your current targets." (`:197`). No "Day 6" pill. Any error, not only a 404, shows this state (`:194`, `noPlan || planQuery.isError`). A cuisine question "Just one quick thing / What flavours feel like home today?" opens before generating (`:73-76`, `:264-265`); it is not in the design.
- 28b (`:168-173`): "Building your plan..." with a spinner only. No checklist, no footnote.
- 28c (`:132-167`): header "Today's plan" with an underlined "See full plan" link (`:120-128`); title "Carbs early, protein steady." is hard-coded (`:134`); no "Left today" card; separate pills "kcal · g protein" per meal (`:144-151`); no "Next up"; no regenerate button on the card. Quick chips come from `GET /meals/assistant-prompts/` (`:155-166`). A proposal sheet and a recipe sheet (`:295-314`, `:334-349`) have no design.
- 28d: `MealPlanCard.tsx:176-178` says "That plan didn't come together." and "The backend finished with no meals…"; `MealPlanScreen.tsx:190-193` says "Plan failed" / "The backend finished without meals…". "Try again" calls regenerate with `surprise_me` (`MealPlanCard.tsx:78-80`, `MealPlanScreen.tsx:198`), which uses one of the day's regenerate slots.

## What to change
- Move each state to the design layout (full light screen with back, "DIET" label and the pill buttons) and use the design copy for all four.
- 28b: build the three-step checklist from the plan status (pending, generating, validating) and the footnote.
- 28c: add the "Left today" card from the daily summary, one glass container for the meals with "Next up", dimmed logged rows, the regenerate button, and the design title.
- 28d: use the design copy and "Or log meals yourself for now". Make "Try again" call generate, not regenerate with a made-up reason.
- Show the 28a state only when there is no plan (404), not for every error.
- Ask the owner about the cuisine pre-question and the proposal and recipe sheets, which the design does not show.

## Acceptance criteria
- [ ] All four states match the design copy and layout.
- [ ] The checklist follows the real plan status.
- [ ] No jargon like "backend" is shown to users.
- [ ] "Try again" does not spend a regenerate slot.

## Backend dependency
Plan endpoints exist (API_REFERENCE §12). Not available: the "Uses 1 of 3 plans today · 2 left after this" line (design line 3209) because there is no quota-usage endpoint (§16 only documents the 429 error), and meal times such as "12:30" because `PlannedMeal` has no time field (`src/shared/types/mealPlan.ts:48-73`). The free `plan_generate` limit is 2 (§16, line 1602), not 3 as the design says. Leave those two items out until the backend and the design agree, and open a backend issue for the quota-usage read.

## How to verify
Generate a plan in mock and live mode, force a failure, and compare each state with frames 28a to 28d.

## Definition of done (from the acceptance criteria)

- [ ] All four states match the design copy and layout.
- [ ] The checklist follows the real plan status.
- [ ] No jargon like "backend" is shown to users.
- [ ] "Try again" does not spend a regenerate slot.
