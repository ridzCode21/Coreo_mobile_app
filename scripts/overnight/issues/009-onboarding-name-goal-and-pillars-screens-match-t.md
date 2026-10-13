# 009 - Onboarding name, goal and pillars screens match the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/9 |
| Type | enhancement |
| Size | big |
| Screens | 7a·1, 7a·2, 7a·3 |
| Labels | enhancement, size:big, area:frontend |

## Summary
The first three interview screens differ from the design in copy, choices and layout. The goal list is also not the six interview goals the backend defines.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 7a·1, 7a·2, 7a·3.
7a·1 "What should I **call you?**" with a voice bar. 7a·2 "{name}, tell me what you want to fix. I'll get you there." with six choices: Get stronger, Sleep better, Less stress, Lose weight, More energy, Eat cleaner (right-aligned, pick one, no Next button). 7a·3 "Where do we **start?**" with "Pick one pillar, two, or take all three. I'll ask the right questions once you choose." Rows are 76px tall with radius 26, plus quick picks "All three" and "These two". Design lines 211-239 (name), 240-268 (goal), 269-306 (pillars).

## Current behavior
- Name (`src/features/onboarding/screens/NameScreen.tsx:41-48`): the mic button does nothing because `onMicPress` is not passed (`VoiceInputBar.tsx:49`).
- Goal (`GoalScreen.tsx`): options come from `GOAL_TYPES` in `src/shared/types/dietProfile.ts:8-14` (lose_weight, maintain, gain_muscle, eat_healthier, manage_condition) with labels in `src/features/onboarding/lib/dietQuestions.ts:86-92`. Subtitle is "I will tune the rest around this." (`:40`). A note "You can sharpen this later from Diet." (`:53`) and a Next button (`:41`) are extra. Options wrap from the left (`:59-63`). Title falls back to "Alright" without a name (`:36`).
- Pillars (`PillarsScreen.tsx`): title is one plain string (`:46`). Subtitle is "...I'll always start with your nutrition core, whatever you choose." (`:47`). The quick picks are missing. A Next button is shown (`:48`). Rows use `ToggleRow` defaults (`src/shared/components/ToggleRow.tsx:41-42`, minHeight 70, radius 28).
- Spacing at the top of every interview step (`OnboardingStepScaffold.tsx:70`, `:137`) is `insets.top + 20` then 20; the design has 76px top padding and 56px before the title.

## What to change
- Replace the goal choices with the six design goals, stored as the backend values `get_stronger`, `sleep_better`, `less_stress`, `lose_weight`, `more_energy`, `eat_healthier`.
- Use the design subtitle on the goal screen. Remove the extra note and the Next button; picking a goal moves on.
- Right-align the goal choices as in the design.
- Pillars: two-weight title, design subtitle, "All three" and "These two" quick picks, 76px rows with radius 26.
- Wire the mic on the name screen to the voice input, or hide it until voice works (do not leave a dead button).
- Align the top spacing of the step layout to the design (76px top, 56px before the title).
- Step order is handled in the "About you step" issue.

## Acceptance criteria
- [ ] The goal screen shows exactly the six design goals and sends the matching backend value.
- [ ] Goal and pillars copy matches the design strings above.
- [ ] No Next button on the goal screen; one tap on a goal continues.
- [ ] "All three" selects all pillars; "These two" is shown as in the design.
- [ ] The mic on the name screen either records or is not shown.
- [ ] No red anywhere; tokens come from `src/shared/theme/tokens.ts`.

## Backend dependency
None for the screens. The goal values are defined in API_REFERENCE §3 and §17. Sending them is covered by the "Signup sends the interview answers" issue.

## How to verify
Open the onboarding flow in the dev build, compare each screen to the design frames 7a·1 to 7a·3, and confirm the goal value in the register request.

## Definition of done (from the acceptance criteria)

- [ ] The goal screen shows exactly the six design goals and sends the matching backend value.
- [ ] Goal and pillars copy matches the design strings above.
- [ ] No Next button on the goal screen; one tap on a goal continues.
- [ ] "All three" selects all pillars; "These two" is shown as in the design.
- [ ] The mic on the name screen either records or is not shown.
- [ ] No red anywhere; tokens come from `src/shared/theme/tokens.ts`.
