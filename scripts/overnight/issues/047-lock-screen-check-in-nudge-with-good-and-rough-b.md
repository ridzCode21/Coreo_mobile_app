# 047 - Lock screen check-in nudge with Good and Rough buttons

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/47 |
| Type | enhancement |
| Size | big |
| Screens | 27c |
| Labels | enhancement, size:big, area:frontend |

## Summary
The 9:00 PM check-in notification is sent by the server, but the app cannot receive it or answer it.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 27c.
A notification "Coreo · 9:00 PM · Evening check-in - Twenty seconds, {name}. How did today feel?" with the actions Good, Rough and Open. Tapping Good or Rough logs the mood without opening the app. Design lines 3134-3185. (27a and 27b are Phase 2.)

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. There is no `expo-notifications` dependency in `package.json` and no device-token call.

## What to change
- Add notifications (flag the new dependency to the owner first), ask for permission with a clear reason, and register the device with `POST /users/me/device-tokens/`.
- Define a notification category with Good, Rough and Open. Good and Rough call `POST /users/me/check-in-notices/{id}/answer/`; "Open" should open the app (the backend only accepts good or rough, so do not send "open" as an answer).
- The server sends this only when the wellness check-in style is `step_in`.

## Acceptance criteria
- [ ] The device is registered and deleted on sign out.
- [ ] Good and Rough answer from the lock screen.
- [ ] Open opens the app (or the check-in screen when it exists).

## Backend dependency
Server side exists (API_REFERENCE §5, lines 783-867; backend issue vipin4250/Self_dev#32, closed). Opening the in-app ritual depends on backend issue vipin4250/Self_dev#51.

## How to verify
Send a test notice from the dev server to a development build and answer it from the lock screen.

## Definition of done (from the acceptance criteria)

- [ ] The device is registered and deleted on sign out.
- [ ] Good and Rough answer from the lock screen.
- [ ] Open opens the app (or the check-in screen when it exists).
