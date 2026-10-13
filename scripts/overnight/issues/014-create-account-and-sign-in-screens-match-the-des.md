# 014 - Create account and sign in screens match the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/14 |
| Type | enhancement |
| Size | big |
| Screens | 8e, 8b |
| Labels | enhancement, size:big, area:frontend |

## Summary
The design has two full screens for email accounts. In the app the sign up form is squeezed into the save screen and the sign in screen is an unstyled placeholder that nobody can reach.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 8e, 8b.
8e "Create your **account.**": Email, Password, hint "At least 8 characters. Not just numbers, not too common, and not too similar to your email or name.", Confirm password, button "Create account", link "I already have an account". 8b "Sign in **with email.**": Email, Password, "Sign in", "Forgot your password?". Fields are labelled glass boxes (uppercase 9px labels, radius 18). Buttons are solid #17191D, 54px, 14/500. Design lines 397-455.

## Current behavior
- 8e does not exist as a screen. The form lives in `SaveScreen.tsx:294-374` and has First and Last name fields (`:296-327`; `splitName` fills a missing last name with "Member" at `:79-84`), no confirm password, no hint, no link to sign in. `password_confirm` is copied from `password` (`authApi.ts:77`), so a mismatch can never be shown. The password schema only checks length (`src/features/auth/schemas.ts:26`). The button is `coreBlue` #35689E (`SaveScreen.tsx:485`).
- 8b is `src/app/(auth)/login.tsx`, which calls itself a placeholder (`:15-19`): title "Coreo" (`:41`), placeholder-only inputs inside a card, `coreBlue` button (`:109`), no "Forgot your password?", and no error shown for wrong credentials (`:33-37` handles success only).

## What to change
- Create an 8e screen with the design copy, labelled fields, a confirm password field and the password hint. Validate "passwords match" on the form.
- Rebuild the sign in screen as 8b: title with wave glyph, labelled fields, solid ink button, "Forgot your password?" link to the reset screen.
- Show a plain, non-red message for a 401 `INVALID_CREDENTIALS` and for validation errors (use the `attention` token).
- Link 8e and 8b to each other, and "Use email instead" (8a) to 8e. First and Last name come from the interview, not this screen.

## Acceptance criteria
- [ ] 8e and 8b match the design copy, order and button style.
- [ ] A mismatch in the two password fields is shown on the form.
- [ ] Wrong credentials show a calm message.
- [ ] Both screens are reachable from the first open and save screens.
- [ ] No red is used.

## Backend dependency
`POST /users/register/` and `POST /users/login/` exist (API_REFERENCE §3). None needed.

## How to verify
Create an account and sign out/in with the dev server; try a wrong password and a mismatched confirm.

## Definition of done (from the acceptance criteria)

- [ ] 8e and 8b match the design copy, order and button style.
- [ ] A mismatch in the two password fields is shown on the form.
- [ ] Wrong credentials show a calm message.
- [ ] Both screens are reachable from the first open and save screens.
- [ ] No red is used.
