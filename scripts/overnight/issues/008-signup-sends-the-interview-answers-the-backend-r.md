# 008 - Signup sends the interview answers the backend requires

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/8 |
| Type | bug |
| Size | big |
| Screens | 8a, 8e, 7a·2, 7a·3, 7a·4 |
| Labels | bug, size:big, area:frontend |

## Summary
Today the app creates an account with only email, password and name. The backend now needs the interview answers in the same call. A real backend would answer every signup with a 400 error. The mock only works because it follows an older contract.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 8a, 8e, 7a·2, 7a·3, 7a·4.
The register call is described in `docs/API_REFERENCE.md` §3 of the backend repo (`django_app/docs/API_REFERENCE.md`). It must send `goal`, `active_pillars`, and, when Diet is picked, `age`, `height_cm`, `weight_kg`, `gender`. The design says "Save me, so I don't forget you. Everything I just learned lives with your account." (8a).

## Current behavior
- `src/features/auth/api/authApi.ts:72-84` sends `email`, `password`, `password_confirm` (copied from `password`), `first_name`, `last_name`, optional `date_of_birth` and `gender`. It never sends `goal`, `active_pillars`, `age`, `height_cm` or `weight_kg`.
- Pillars are only kept in the local onboarding draft. Neither the register call nor the diet-profile update in `src/features/onboarding/screens/SaveScreen.tsx:65-71` sends them.
- `SaveScreen.tsx:57-60` turns the age into a made-up birth date (January 1st). The API takes `age` directly.
- `SaveScreen.tsx:166-175` makes a second call, `PUT /users/me/diet-profile/`, after register. The API says no follow-up write is needed. That second call is also why the "account saved, plan not saved - Retry" state exists (`SaveScreen.tsx:173`, `:379-388`).
- `src/features/auth/mocks/handlers.ts:43` and `src/features/auth/schemas.ts:24` require a last name; the API says `last_name` is optional.

## What to change
- Send one `POST /users/register/` with `first_name`, `goal`, `active_pillars`, and `age`, `height_cm`, `weight_kg`, `gender` when Diet is chosen. Make `last_name` optional.
- Use the backend goal values (`get_stronger`, `sleep_better`, `less_stress`, `lose_weight`, `more_energy`, `eat_healthier`). The goal screen change itself is tracked in the "Onboarding name, goal and pillars" issue.
- Stop inventing a birth date. Send `age`.
- Remove the second diet-profile write and the "account saved, plan not saved" retry state. Keep a plain error state for a failed register.
- Update the mock register handler and the zod schemas to the same contract, so the mock and the real API behave the same.
- Handle `VALIDATION_ERROR` field errors on the form.

## Acceptance criteria
- [ ] The request body matches API_REFERENCE §3 for a Diet-only, Fitness-only and all-three user.
- [ ] No second diet-profile call happens after register.
- [ ] `last_name` is optional in the schema and the mock.
- [ ] The mock register handler rejects a body that is missing `goal` or `active_pillars`, like the real API.
- [ ] Typecheck, lint and format checks pass.

## Backend dependency
`POST /users/register/` already exists and is documented (backend issues vipin4250/Self_dev#21 and vipin4250/Self_dev#22, both closed). No backend change is needed.

## How to verify
Run the app in live API mode against the Django dev server, finish onboarding, and check in the server log that one register call carried goal, pillars and body basics and that the user comes back with `onboarding_complete: true`. Repeat in mock mode.

## Definition of done (from the acceptance criteria)

- [ ] The request body matches API_REFERENCE §3 for a Diet-only, Fitness-only and all-three user.
- [ ] No second diet-profile call happens after register.
- [ ] `last_name` is optional in the schema and the mock.
- [ ] The mock register handler rejects a body that is missing `goal` or `active_pillars`, like the real API.
- [ ] Typecheck, lint and format checks pass.
