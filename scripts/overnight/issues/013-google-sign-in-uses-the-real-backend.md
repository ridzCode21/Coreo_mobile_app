# 013 - Google sign-in uses the real backend

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/13 |
| Type | bug |
| Size | small |
| Screens | 8a |
| Labels | bug, size:small, area:frontend |

## Summary
The "Continue with Google" button pretends to sign in. It registers a fake `@mock.coreo.app` account. Google sign-in is part of the MVP and the backend route already exists.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 8a.
8a shows "Continue with Google" next to "Use email instead". The backend takes `{identity_token, first_name, goal, active_pillars, ...}` at `POST /users/google/` (API_REFERENCE §3).

## Current behavior
- `src/features/onboarding/screens/SaveScreen.tsx:100-114` and `:237-241` call register with a generated `@mock.coreo.app` email.
- `src/features/auth/api/authApi.ts` has no call for `POST /users/google/`.

## What to change
- Add a Google sign-in step that gets a Google identity token on the device and calls `POST /users/google/` with the interview answers.
- Add the mock handler for the same route so mock mode keeps working.
- Flag the library choice to the owner before adding a package (CLAUDE.md §6: new dependencies need a heads-up).

## Acceptance criteria
- [ ] Tapping Google returns a real identity token and signs the user in through `/users/google/`.
- [ ] Interview answers are saved by that same call.
- [ ] Mock mode still works.
- [ ] Tokens are stored only in secure storage.

## Backend dependency
`POST /users/google/` exists (backend issue vipin4250/Self_dev#23, closed). No backend change needed.

## How to verify
Sign in with a real Google account against the dev server and check the user and profile are created with the interview answers.

## Definition of done (from the acceptance criteria)

- [ ] Tapping Google returns a real identity token and signs the user in through `/users/google/`.
- [ ] Interview answers are saved by that same call.
- [ ] Mock mode still works.
- [ ] Tokens are stored only in secure storage.
