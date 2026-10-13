# 010 - About you step matches the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/10 |
| Type | enhancement |
| Size | small |
| Screens | 7a·4 |
| Labels | enhancement, size:small, area:frontend |

## Summary
The design has one "The basics" screen with age, height, weight and sex, shown only when Diet was chosen. The app shows it to everyone and puts sex on a separate screen with extra copy.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 7a·4.
Title "The basics, so my **math is right.**" Sliders for Age (26), Height (5'11"), Weight (172 lb) and a Sex card with chips Male, Female, Other, Prefer not to say. The button is a solid #17191D pill labelled "Continue" with an arrow. Shown only if Diet was picked. Design lines 307-364.

## Current behavior
- `src/features/onboarding/lib/steps.ts:30-34`: `isFlowStepVisible` always returns true, so everyone sees the step.
- `src/features/onboarding/screens/GenderScreen.tsx:45,48` is a separate screen with "And how do you **identify?**" and "Helps me get your numbers right." These strings are not in the design. Chip labels match (`:15-20`).
- `AboutYouScreen.tsx:41` adds the subtitle "Slide, or just tell me." (not in design). The button is the shared night-glass `NextBar` labelled "Next" (`:42`).
- Units are cm and kg (`AboutYouScreen.tsx:58`, `:66`). The design shows feet/inches and pounds. The code comment at `:17-19` says cm/kg is a deliberate choice.

## What to change
- Show the step only when the Diet pillar was picked (pillars must be chosen before it, or the rule must be applied in the flow).
- Move the sex chips into the same screen, as a fourth card, and delete the separate screen and its copy.
- Use the design button: solid ink pill, "Continue", arrow.
- Remove the extra subtitle.
- Step order: the design puts Pillars third, before About you; the app asks pillars fifth (`src/features/onboarding/lib/steps.ts:10`). Pillars must be known before the Diet-only rule can work, so move Pillars earlier.
- Units: the app uses cm and kg on purpose (`AboutYouScreen.tsx:17-19`); the design shows feet/inches and pounds. This is a design question for the owner. Do not change units in this issue unless the owner decides.

## Acceptance criteria
- [ ] People who did not pick Diet never see the step.
- [ ] Age, height, weight and sex are on one screen with the design copy.
- [ ] The button reads "Continue" and matches the design style.
- [ ] The values sent to the API are `age`, `height_cm`, `weight_kg`, `gender`.

## Backend dependency
None. `age`, `height_cm`, `weight_kg`, `gender` are in the register request (API_REFERENCE §3).

## How to verify
Run onboarding choosing only Fitness (step is skipped) and then choosing Diet (step appears) and compare with frame 7a·4.

## Definition of done (from the acceptance criteria)

- [ ] People who did not pick Diet never see the step.
- [ ] Age, height, weight and sex are on one screen with the design copy.
- [ ] The button reads "Continue" and matches the design style.
- [ ] The values sent to the API are `age`, `height_cm`, `weight_kg`, `gender`.
