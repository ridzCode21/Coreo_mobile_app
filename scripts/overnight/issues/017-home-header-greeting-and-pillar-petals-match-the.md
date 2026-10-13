# 017 - Home header, greeting and pillar petals match the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/17 |
| Type | enhancement |
| Size | big |
| Screens | 10a, 24b |
| Labels | enhancement, size:big, area:frontend |

## Summary
The home screen is a different layout from the design. It has no greeting with the user's name, no date header, petals in the wrong order and showing values, and a different background.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 10a, 24b.
Header: wave mark and "coreo" on the left, date ("Mon · Jul 7") on the right. Greeting "Morning, **{name}.**" (28px, weight 200, name 400) and a short line under it. Four petals in a 2x2: Wellness top-left, Fitness top-right, Diet bottom-left, Core bottom-right (Core is brighter, weight 500), labels only. Background gradient #D3E6F8 to #9EC3E8 to #6F9CCE. Design lines 82-159 and 627-685.

## Current behavior
- `src/features/home/screens/CoreoHomeScreen.tsx`: one centred uppercase "Coreo" label and no date (`:91`, `:283-288`). The headline is made on the device (`:72-78`, with `hasInsight = false` at `:71`). The user's name is never fetched; nothing in `src` calls `/users/profile/`. No "Morning," greeting.
- Petals are ordered Diet, Fitness, Wellness, Coreo (`:210-235`) and the corner shape follows the order (`src/shared/components/PetalCluster.tsx:18-27`), so the large corner lands on the wrong pillar. The label says "Coreo" instead of "Core". They show values such as kcal, "Logged", "Open" (`:214-232`). Labels use one text style (`PetalCluster.tsx:114-118`). The Core petal opens `/core`, the screen the user is already on (`:234`).
- Background gradient is `[zenith, day, air]` (`:86-89`), which ends at #9EC3E8, not #6F9CCE.
- Extra blocks not in the design: "Personalize your diet" card (`:132-147`), "+ Log meal" / "+ Add workout" pills (`:149-166`), a "Signals" card with "No health signals yet." (`:168-207`).

## What to change
- Add the header row (wave mark, "coreo", date).
- Get the user's first name (the login and register responses already return `first_name`; keep it in the session store, or call `GET /users/profile/`) and render the time-of-day greeting.
- Reorder and relabel the petals (Wellness, Fitness, Diet, Core), labels only, Core in weight 500; fix the corner shapes for the new order. Make the Core petal do something useful or not be a link.
- Use the design background gradient (see the design token issue).
- Ask the owner what happens to the extra cards (personalize, log pills, signals); the design does not show them. Keep the "Personalize your diet" prompt somewhere that does not break the design, or move it to the Diet tab.

## Acceptance criteria
- [ ] Header, greeting with name, and date match the design.
- [ ] Petal order, labels and weights match; no values on petals.
- [ ] Background gradient matches.
- [ ] A decision about the extra cards is written in the PR.

## Backend dependency
`first_name` comes back from login and register (API_REFERENCE §3) and `GET /users/profile/` (§4) exists. The score, the nudge line and the wave are tracked in "Home wave, score and the one nudge".

## How to verify
Sign in and compare home with frames 10a and 24b.

## Definition of done (from the acceptance criteria)

- [ ] Header, greeting with name, and date match the design.
- [ ] Petal order, labels and weights match; no values on petals.
- [ ] Background gradient matches.
- [ ] A decision about the extra cards is written in the PR.
