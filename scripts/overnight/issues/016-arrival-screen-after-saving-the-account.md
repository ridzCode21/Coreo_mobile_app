# 016 - Arrival screen after saving the account

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/16 |
| Type | enhancement |
| Size | small |
| Screens | 7a·8 |
| Labels | enhancement, size:small, area:frontend |

## Summary
After saving, the app jumps straight into the home screen. The design has a short arrival screen first.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 7a·8.
Title "That's everything, **{name}.**" "Your pillars are waiting. Come meet them." Note: "For the first few days your wave stays dashed while I learn you. I will never show you an invented number." Four petals (Wellness, Fitness, Diet, Core with Core highlighted), pill "Enter Coreo" with an arrow, fifth progress dot active. Design lines 577-626.

## Current behavior
- `src/features/onboarding/screens/SaveScreen.tsx:171` does `router.replace('/(app)')` after a successful save.
- `src/features/onboarding/screens/CalibratingScreen.tsx` is an older screen that is not part of the flow (`src/app/(public)/onboarding/_layout.tsx`). `docs/feature-map.md` says the old tail was removed on purpose in the v3 flow. The design still shows this screen, so the owner should confirm.

## What to change
- Confirm with the owner that the arrival screen should return (the design is the source of truth).
- Build the arrival screen with the design copy and "Enter Coreo", and go to it after save; remove or reuse `CalibratingScreen.tsx`.

## Acceptance criteria
- [ ] After a successful save the arrival screen shows with the user's name.
- [ ] "Enter Coreo" opens home.
- [ ] Copy matches the design and does not show invented numbers.

## Backend dependency
None.

## How to verify
Finish onboarding and compare the arrival screen with frame 7a·8.

## Definition of done (from the acceptance criteria)

- [ ] After a successful save the arrival screen shows with the user's name.
- [ ] "Enter Coreo" opens home.
- [ ] Copy matches the design and does not show invented numbers.
