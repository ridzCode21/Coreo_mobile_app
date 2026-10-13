# 043 - Chat presence screen with receipts

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/43 |
| Type | enhancement |
| Size | big |
| Screens | 18c |
| Labels | enhancement, size:big, area:frontend |

## Summary
There is no chat. The backend can take one sentence and propose changes to dinner, the lift or the wind-down.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 18c.
A full screen "Listening" with the heard text ("...skipped lunch, and I really don't feel like the gym."), the reply ("Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday."), receipt chips "Fitness moved", "Dinner set", "Wind-down 9:30", and the hint "Hold to talk · tap the bubble to type". Design lines 2450-2507.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `VoiceInputBar.tsx` exists. The home screen has no "Ask me anything" bar.

## What to change
- Build the screen and call `POST /users/me/chat/`; show the reply and the receipts.
- The backend asks for a confirm before applying a change (`requires_confirmation`) and supports undo. The design shows neither. Ask the design owner where Confirm and Undo go, and do not apply changes silently.
- Speech to text happens on the device; the "hold the mic anywhere" gesture is not designed in the dock. Start with the typed path.

## Acceptance criteria
- [ ] A typed message returns a reply and receipts.
- [ ] Nothing is applied before the user confirms.
- [ ] Undo works.

## Backend dependency
`POST /users/me/chat/`, `/confirm/` and `/undo/` exist (API_REFERENCE §5, lines 671-733; backend issue vipin4250/Self_dev#30, closed).

## How to verify
Send "move my session to Thursday" in live mode and compare with frame 18c.

## Definition of done (from the acceptance criteria)

- [ ] A typed message returns a reply and receipts.
- [ ] Nothing is applied before the user confirms.
- [ ] Undo works.
