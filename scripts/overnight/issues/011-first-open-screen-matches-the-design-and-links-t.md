# 011 - First open screen matches the design and links to sign in

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/11 |
| Type | enhancement |
| Size | small |
| Screens | 24a, 20a |
| Labels | enhancement, size:small, area:frontend |

## Summary
The first screen has the wrong button copy and shape, and returning users have no way to reach sign in.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 24a, 20a.
Tagline "A health app with a core." Button "Meet your core": full width, 58px tall, radius 29, label on the left, 42px round arrow button on the right (navy gradient in 24a, #17191D in 20a). A link "I already have an account" under it. 20a also says "Returning account? Sign in at 8b and skip the interview." Background gradient ends #6F9CCE; a soft white glow sits behind a 74px logo; 24a has a wave background. Design lines 54-81 and 160-210.

## Current behavior
- `src/features/onboarding/screens/FirstOpenScreen.tsx:61` says "Begin"; the design says "Meet your core".
- The button is a centred glass pill with `minWidth: 200` and no arrow (`:59-63`, `:88-91`).
- There is no "I already have an account" link. Nothing routes to `src/app/(auth)/login.tsx`; `src/features/splash/lib/resolveLaunchDestination.ts:29-31` only returns the app, the resume step, or first-open.
- No wave background and no radial glow. Gradient ends at `colors.sky` #7FA0C6 (`:37`, `tokens.ts:17`). Logo is 64px (`:55`); design is 74px.

## What to change
- Use the design button copy, shape and arrow button.
- Add the "I already have an account" link and route it to the sign in screen.
- Add the wave background and the glow behind the logo; use the design gradient end colour (see the design token issue) and a 74px logo.

## Acceptance criteria
- [ ] Button reads "Meet your core" and matches the design shape.
- [ ] "I already have an account" opens the sign in screen.
- [ ] Logo, glow and gradient match the design.

## Backend dependency
None.

## How to verify
Fresh install: open the app, compare to frame 24a, tap the account link and confirm sign in opens.

## Definition of done (from the acceptance criteria)

- [ ] Button reads "Meet your core" and matches the design shape.
- [ ] "I already have an account" opens the sign in screen.
- [ ] Logo, glow and gradient match the design.
