# 052 - Align theme tokens with the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/52 |
| Type | enhancement |
| Size | big |
| Screens | All screens |
| Labels | enhancement, size:big, area:frontend |

## Summary
Several design values are missing from `tokens.ts`, so screens hard-code them or use near matches. Fixing the tokens first makes every other screen issue smaller.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: All screens.
The design uses one sky gradient `168deg #D3E6F8 0% / #9EC3E8 48% / #6F9CCE 100%` (70 uses in "Coreo App Screens") and a second sheet gradient `#A3C4E5 / #7299C6 52% / #54779F` (18 uses). Primary buttons are solid #17191D (63 uses), not blue. Night-glass text is #F0F4F8 (74 uses). Fonts are Poppins 200, 300, 400, 500 only (checked: the app already loads exactly these; the DM Sans and DM Mono worry does not apply to this app). Brand Book: `Coreo Brand Book.dc.html`.

## Current behavior
- `src/shared/theme/tokens.ts:7-33`: no #6F9CCE, no second sheet gradient, `onNight` is #EFF4F9 (`:29`, design #F0F4F8). `ink60` is actually .62 (`:9`); the design uses .5, .55, .6 and .75, which have no token, so `ToggleRow.tsx:216` hard-codes `rgba(23,25,29,0.8)`.
- `PrimaryIconButton.tsx:39-40` uses the blue gradient and no file imports it. The only blue button in the design is one circle on first open.
- Type: `questionTitle` and `greeting` have no line height (design 1.4 and 1.35); `sheetTitle` letter spacing is -0.4 (design -0.5); `micro` is 1.2 (design 1.4); body line height 1.85 (design 1.8); there is no token for the 19/300 card title, the 13.5/500 and 14/500 button text, 12/300 small text, or the 11/400 caption. `NextBar.tsx:62` sets 13.5 on the body style, so it renders weight 300 where the design uses 500. `OnboardingStepScaffold.tsx:110-114` overrides the question title by hand.
- Radius: no tokens for 12, 22 and 36 (hard-coded at `ToggleRow.tsx:229-251`, `BottomDock.tsx:128`, `VoiceInputBar.tsx:114,124`). Spacing: the design's most used gaps 14 (110 uses) and 10 (61 uses) have no token; `screenPadTop` is 70 where the design uses 64 or 76.
- `colors.success` #2F5D3A and `colors.attention` #7A5220 are in no current design file (only in `docs/design-system.md`). The design uses #3E8E63 (Verified) and #2C5EA8 (link). `attention` is used in six places.

## What to change
- Add `skyGradient` and `sheetSkyGradient` tokens (colours and stops), the missing ink alpha steps (rename `ink60` to match its value), and decide the #F0F4F8 vs #EFF4F9 difference.
- Add the missing type styles (card title, button, small, caption 11) and line heights, and fix the `sheetTitle` and `micro` letter spacing.
- Add radius tokens 12, 22, 36 and spacing tokens 10 and 14; settle the screen top padding.
- Make primary buttons solid ink; delete or restyle `PrimaryIconButton`.
- Update `docs/design-system.md` in the same branch. Ask the owner whether the Brand Book palette (Fog #EFF4F8, Mist #A9B4BD, Ember) belongs in the app.
- Keep the change to tokens and docs only; do not restyle screens here.

## Acceptance criteria
- [ ] Every value listed above has a token, or an owner decision explaining why not.
- [ ] `docs/design-system.md` matches `tokens.ts`.
- [ ] Typecheck, lint and format checks pass and no screen changes look.

## Backend dependency
None.

## How to verify
Compare `tokens.ts` with the lists above and with the Brand Book file.

## Definition of done (from the acceptance criteria)

- [ ] Every value listed above has a token, or an owner decision explaining why not.
- [ ] `docs/design-system.md` matches `tokens.ts`.
- [ ] Typecheck, lint and format checks pass and no screen changes look.
