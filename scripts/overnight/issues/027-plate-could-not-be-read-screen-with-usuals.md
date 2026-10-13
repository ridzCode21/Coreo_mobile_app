# 027 - Plate could not be read screen with usuals

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/27 |
| Type | enhancement |
| Size | small |
| Screens | 25a |
| Labels | enhancement, size:small, area:frontend |

## Summary
When a plate photo cannot be read the app only shows one line of text inside the sheet.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 25a.
"Snap · Lunch", "I couldn't read that plate. Too dark, maybe. Describe it and I've got you." A "Describe it" tile, a short "Your usuals" list (Rice bowl, paneer / Dal, roti, salad / Protein shake), "Try another photo", and "Nothing was logged yet." Design lines 2799-2847.

## Current behavior
- `src/features/nutrition/components/LogMealSheet.tsx:165-166` and `:221` show the API error text or "I couldn't read that one. Describe it and I'll do the math." as a notice.

## What to change
- Build the 25a screen with the design copy and actions.
- Fill "Your usuals" from `GET /food/usuals/` (see the usuals issue).

## Acceptance criteria
- [ ] A failed photo opens 25a with the design copy.
- [ ] "Describe it" and "Try another photo" work; nothing is saved.

## Backend dependency
`GET /food/usuals/` exists (API_REFERENCE §8, line 1034).

## How to verify
Photograph something unreadable in live mode and compare with frame 25a.

## Definition of done (from the acceptance criteria)

- [ ] A failed photo opens 25a with the design copy.
- [ ] "Describe it" and "Try another photo" work; nothing is saved.
