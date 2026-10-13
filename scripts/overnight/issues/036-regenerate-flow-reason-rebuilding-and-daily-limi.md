# 036 - Regenerate flow: reason, rebuilding and daily limit states

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/36 |
| Type | bug |
| Size | big |
| Screens | 30c, 30d, 30e, 34a |
| Labels | bug, size:big, area:frontend |

## Summary
Regenerating a plan has two broken moments: the screen says "No plan is ready yet" while the new plan builds, and when the daily limit is reached nothing visible happens.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 30c, 30d, 30e, 34a.
30c "What's not working today? Pick one — I'll rebuild around it." eight chips and "Regenerate plan". 30d full screen "Just one quick thing - How much cooking feels doable most days?" with options (Barely any, Something simple, I actually like cooking), the note below and "Continue". 30e the same sheet with a card "Today's regenerates are spent. You've used all 3 for today. More unlock in 14 hours — today's plan still stands, and it's a good one." and a white "Keep today's plan" button. 34a "Rebuilding your plan… Fitting it to "Too much cooking."" with steps Hearing you out, Swapping out the heavy cooking, Double-checking it adds up and "This won't count against today until it's ready." Design lines 3568-3639 and 3908-3943.

## Current behavior
- `src/features/nutrition/screens/MealPlanScreen.tsx:83-86` closes the regenerate sheet only on success. On a daily limit error (429) the sheet stays open and the limit banner is drawn in the screen body at `:177`, behind the open modal (`:270`), so the user sees nothing change. `QuotaBanner.tsx:15` says "Today's limit is spent", adds the backend message and "More unlocks in Xh" (`:17`, `src/features/nutrition/lib/quotaError.ts:15-21`), shows a "free · 2/day" chip (`:19-23`) and has no "Keep today's plan" button.
- After a successful regenerate the plan is "pending" and `MealPlanScreen.tsx` has no building branch, so it falls to "No plan is ready yet. Generate one from Diet." (`:212`). The plan card has a building state (`MealPlanCard.tsx:168-173`) but the full plan screen does not.
- 30d: the note is above the chips (`:282-285`); the "Just one quick thing" label only exists in the cuisine sheet (`MealPlanCard.tsx:264`); the option reads "I like cooking" (`:48`); a budget question (`:39-43`, `:277`) is not in the design. 30c copy and chips match the design.

## What to change
- Show the limit message inside the open sheet (design 30e) with "Keep today's plan", and keep the sheet open on error.
- Remove the "free · 2/day" tier chip. `docs/mvp.md` says 30e is a shared daily wait, not an upgrade.
- Add the building state (34a) to the plan screen and show the three steps while status is pending, generating and validating.
- Match the 30d layout and copy; ask the owner about the budget question.

## Acceptance criteria
- [ ] A daily limit shows the 30e card inside the sheet.
- [ ] After regenerate the screen shows the rebuilding state, never "No plan is ready yet".
- [ ] No upgrade or tier wording appears.
- [ ] 30c, 30d and 34a copy matches the design.

## Backend dependency
Regenerate and its 429 error exist (API_REFERENCE §12, §16). The design says "all 3" and "1 of 3" but the free limit is 2 (§16, line 1602-1603), and there is no read endpoint for the used count. Settle the number with the design owner and use the numbers in the error response.

## How to verify
Regenerate until the limit in mock and live mode, and compare with frames 30c to 30e and 34a.

## Definition of done (from the acceptance criteria)

- [ ] A daily limit shows the 30e card inside the sheet.
- [ ] After regenerate the screen shows the rebuilding state, never "No plan is ready yet".
- [ ] No upgrade or tier wording appears.
- [ ] 30c, 30d and 34a copy matches the design.
