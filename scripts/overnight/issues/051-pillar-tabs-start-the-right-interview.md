# 051 - Pillar tabs start the right interview

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/51 |
| Type | enhancement |
| Size | small |
| Screens | 7a·3, 16b, 17b |
| Labels | enhancement, size:small, area:frontend |

## Summary
Choosing a pillar in onboarding does not change what the Fitness and Wellness tabs show. They are placeholders for everyone.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 7a·3, 16b, 17b.
7a·3 says "I'll ask the right questions once you choose." Pillars chosen at signup are the user's `active_pillars`. Design lines 269-306.

## Current behavior
- `src/features/home/screens/PillarComingSoonScreen.tsx` is shown for both tabs regardless of the user's choices; pillars are not stored (see "Signup sends the interview answers the backend requires").

## What to change
- Use `active_pillars` to decide which tabs start an interview (Fitness 16a, Wellness 17a) and which show the home screens.
- Show a calm invitation (not a lock) for a pillar the user did not pick.

## Acceptance criteria
- [ ] A user who picked Fitness is taken into the Fitness interview on first open of the tab.
- [ ] A user who did not pick a pillar sees an invitation, not a broken screen.

## Backend dependency
`active_pillars` is part of the register request and the user object (API_REFERENCE §3).

## How to verify
Sign up with only Wellness and open each tab.

## Definition of done (from the acceptance criteria)

- [ ] A user who picked Fitness is taken into the Fitness interview on first open of the tab.
- [ ] A user who did not pick a pillar sees an invitation, not a broken screen.
