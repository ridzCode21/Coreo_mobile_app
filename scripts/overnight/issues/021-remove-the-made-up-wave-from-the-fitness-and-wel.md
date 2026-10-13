# 021 - Remove the made-up wave from the Fitness and Wellness placeholders

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/21 |
| Type | bug |
| Size | small |
| Screens | Fitness and Wellness tabs |
| Labels | bug, size:small, area:frontend |

## Summary
The placeholder pillar tabs draw a wave with a fixed value. The product rule is that the app never shows an invented number or wave.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: Fitness and Wellness tabs.
Brand rule in `docs/mvp.md`: "never an invented number (the wave stays dashed until day 4)".

## Current behavior
- `src/features/home/screens/PillarComingSoonScreen.tsx:39` draws `WaveChart progress={0.36}` with no data behind it.
- The copy "No fake data." and "Phase 6" (`:33`, `:37`) is internal wording. The tab says logging is waiting, but the Fitness and Wellness backend endpoints already exist.

## What to change
- Draw the dashed wave only (or no wave) until the real Fitness and Wellness screens exist.
- Replace the internal wording with plain copy for users.

## Acceptance criteria
- [ ] No solid wave segment is drawn on the placeholders.
- [ ] No internal phase wording shows to users.

## Backend dependency
None.

## How to verify
Open the Fitness and Wellness tabs and confirm there is no solid wave and no "Phase 6" text.

## Definition of done (from the acceptance criteria)

- [ ] No solid wave segment is drawn on the placeholders.
- [ ] No internal phase wording shows to users.
