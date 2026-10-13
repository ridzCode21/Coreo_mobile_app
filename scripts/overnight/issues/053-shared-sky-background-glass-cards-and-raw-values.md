# 053 - Shared sky background, glass cards and raw values

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/53 |
| Type | enhancement |
| Size | big |
| Screens | All screens |
| Labels | enhancement, size:big, area:frontend |

## Summary
Background gradients and glass cards are rebuilt by hand in many places and use the wrong colours. This issue moves them into shared components. It depends on the token issue.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: All screens.
Sky background as above. Glass: light glass `135deg .62 to .20` with border .55 and shadow .14; night glass mostly `150deg .6 to .7` with border .22; chip glass `.5 to .14`, border .55; sheet glass `160deg .82 to .55`, blur 34, border .85, radius 36 (design uses blur 26px in 82 places and 34px in 15). Design file counts are from "Coreo App Screens".

## Current behavior
- Six screens use `[zenith, day, air]` straight down (it ends at #9EC3E8): `CoreoHomeScreen.tsx:87`, `PillarComingSoonScreen.tsx:27`, `DietHomeScreen.tsx:60`, `MealDetailScreen.tsx:193`, `MealPlanScreen.tsx:115`, `ConfirmMealScreen.tsx:118`. Three use `[day, air, sky]` with the right angle but end at #7FA0C6: `OnboardingStepScaffold.tsx:59-62`, `FirstOpenScreen.tsx:37`, `SplashScreen.tsx:62`.
- `src/shared/components/GlassCard.tsx`: night glass is `.55 to .68` (`:80-85`, design `.6 to .7` at 150deg); light border .6 and shadow .16; blur is off on Android (`:46`); no chip or sheet variant. `SelectableChip.tsx:37,64` uses `.5 to .18` with border .6.
- Glass is rebuilt outside `GlassCard`: `ToggleRow.tsx:145-148`, `PetalCluster.tsx:52-53,79,99`, `VoiceInputBar.tsx:117-119`, `MealDetailScreen.tsx:660-911`.
- Raw colour values in components: `MealDetailScreen.tsx` (18), `ToggleRow.tsx` (16), `MealPlanScreen.tsx` (11), `BarcodeScannerScreen.tsx` (8), `PetalCluster.tsx` (8), and six each in `SaveScreen.tsx`, `MealPlanCard.tsx`, `BarcodeScannerView.tsx`, `CoreoHomeScreen.tsx`; `ToggleRow.tsx:158` uses `#FFFFFF`. Raw sizes: `NextBar.tsx:62`, `SaveScreen.tsx:436,450,526`, `BarcodeScannerScreen.tsx:200,241` (letter spacing).
- `MealPlanScreen.tsx:353` sets `fontSize: 28` with no font family, so the back arrow at `:121` renders in the system font.

## What to change
- Add one shared sky background component using the new token and replace the nine hand-written gradients.
- Fix the glass recipes in `GlassCard` (night, light) and add chip and sheet variants; route the screens listed above through it.
- Replace the raw colours, sizes, radii and spacing listed above with tokens. Fix the font family at `MealPlanScreen.tsx:353`.
- Keep screen layouts unchanged; layout fixes live in the screen issues.

## Acceptance criteria
- [ ] Nine screens use the shared background.
- [ ] No screen builds its own glass recipe.
- [ ] A search for hex and `rgba(` literals in components finds only token files.
- [ ] The back arrow uses Poppins.

## Backend dependency
None.

## How to verify
Compare screens with the design before and after; run typecheck, lint and format checks.

## Definition of done (from the acceptance criteria)

- [ ] Nine screens use the shared background.
- [ ] No screen builds its own glass recipe.
- [ ] A search for hex and `rgba(` literals in components finds only token files.
- [ ] The back arrow uses Poppins.
