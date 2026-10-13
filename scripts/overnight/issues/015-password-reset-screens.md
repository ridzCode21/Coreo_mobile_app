# 015 - Password reset screens

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/15 |
| Type | enhancement |
| Size | big |
| Screens | 8c, 8d |
| Labels | enhancement, size:big, area:frontend |

## Summary
There is no way to reset a password in the app. The backend is ready.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 8c, 8d.
8c "Reset your **password.**": "Tell us the email on your account. We'll send a reset token." Email field, "Send reset email". Sent state: "Check your **inbox.**" "If that email has a Coreo account, a reset token is on its way. It expires in 1 hour." Links "Enter the token" and "Send it again". 8d "Set a new **password.**" (title at design line 499): Reset token ("Paste it here", hint "It's in the email, on the line that starts with token:"), New password, Confirm password, "Reset password". Errors: "That token didn't work. It may have expired or already been used — request a new one." with "Request a new token", and "Passwords do not match." Success: "Password reset" "Sign in with your new password." button "Sign in" and "You are not signed in automatically." Design lines 456-576.

## Current behavior
- No route, screen or hook exists. A search of `src` for `password-reset` finds nothing.
- Note: the design error state uses a brick red (#9A3C32 and red tints, design lines 532-545). The product rule is "never red". Build the errors with the `attention` token and let the design owner confirm (see Design questions in the issue comments).

## What to change
- Add routes `reset-password` (8c, sent state) and `new-password` (8d, error and success states) under the auth group.
- Add API hooks for `POST /users/password-reset/` and `POST /users/password-reset/confirm/` with `{token, new_password, new_password_confirm}`.
- Always show the same "Check your inbox" copy whether or not the email exists.
- Map `INVALID_TOKEN` to the banner and mismatched passwords to the field message. On success go to sign in; do not sign the user in.
- Add the mock handlers.

## Acceptance criteria
- [ ] All four 8c/8d states exist and match the design copy.
- [ ] The API calls match API_REFERENCE §7.
- [ ] The user is not signed in automatically after reset.
- [ ] Error colours use `attention`, not red.

## Backend dependency
`POST /users/password-reset/` and `/confirm/` exist (backend issue vipin4250/Self_dev#9, closed).

## How to verify
Request a reset on the dev server, paste the token from the email, set a new password, and sign in with it. Try an expired token.

## Definition of done (from the acceptance criteria)

- [ ] All four 8c/8d states exist and match the design copy.
- [ ] The API calls match API_REFERENCE §7.
- [ ] The user is not signed in automatically after reset.
- [ ] Error colours use `attention`, not red.
