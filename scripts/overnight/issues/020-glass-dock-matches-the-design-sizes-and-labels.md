# 020 - Glass dock matches the design sizes and labels

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/20 |
| Type | enhancement |
| Size | small |
| Screens | 23a |
| Labels | enhancement, size:small, area:frontend |

## Summary
The bottom dock has the right items and taps, but its size, radius, icons and labels are bigger than the design.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 23a.
Dock height 72, radius 36, icon circle 36, icon size 17, label 8.5px (active label weight 500), glass gradient .7 to .38 with blur 30. Items Diet, Fitness, Wellness, Coreo. Design lines 772-844.

## Current behavior
- `src/shared/components/BottomDock.tsx`: `minHeight: 88` (`:112`), radius 38 (`:77`), icon circle 44 (`:126-128`), icons 24/25 (`:25`, `:60`), label 11.5/400 (`:141`) and the active label only changes colour (`:144-146`).
- The glass uses the shared light card (.62 to .2) at `GlassCard.tsx:74`. The diet and fitness icon art differs from the design (`:27`, `:39`).

## What to change
- Match the dock sizes, radius, icon size, label size and weights above.
- Use a dock glass recipe from the design (see the glass token issue).
- Match the icon artwork for Diet and Fitness.

## Acceptance criteria
- [ ] Dock dimensions and text match the design.
- [ ] Active and inactive labels differ in weight, not only colour.
- [ ] Taps and hidden-on-scan behaviour are unchanged.

## Backend dependency
None.

## How to verify
Compare the dock with frame 23a on a phone and a small phone.

## Definition of done (from the acceptance criteria)

- [ ] Dock dimensions and text match the design.
- [ ] Active and inactive labels differ in weight, not only colour.
- [ ] Taps and hidden-on-scan behaviour are unchanged.
