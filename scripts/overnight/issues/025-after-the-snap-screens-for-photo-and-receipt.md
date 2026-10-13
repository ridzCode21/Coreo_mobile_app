# 025 - After the snap screens for photo and receipt

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/25 |
| Type | enhancement |
| Size | small |
| Screens | 21a, 21b |
| Labels | enhancement, size:small, area:frontend |

## Summary
After a photo is analysed the design shows a result with the photo and a clear "one thing I couldn't see" prompt, then a receipt once saved. The app goes straight to the edit form.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 21a, 21b.
21a: "Logged · Lunch", the user's photo with item labels (Rice · 1 cup, Paneer · 80g, Greens · 1 cup, Dressing?), the meal name and totals, "One thing I couldn't see - The dressing. Ghee or oil changes 90 kcal.", buttons "Fix" and "Looks right". Design lines 1562-1609. 21b: the saved receipt with "Leaves 600 for dinner. Right on plan.", item rows and "Dressing · my guess" with "Fix". Design lines 1610-1669.

## Current behavior
- `src/features/nutrition/components/LogMealSheet.tsx:157-164` sends every photo straight to the edit form.
- `items[]`, `guessed_count` and `guess_note` are returned by the API but dropped (see the "Check my math" issue).

## What to change
- Add the 21a screen after a photo result with the picture, item labels and the guess note.
- Add the 21b receipt after saving, using the remaining calories for the day.
- Link "Fix" to the "Check my math" screen.

## Acceptance criteria
- [ ] A photo log shows 21a, then 21b after saving.
- [ ] The guess note appears only when `guessed_count` is above zero.
- [ ] No invented number; "leaves N for dinner" comes from the daily summary.

## Backend dependency
`items[]`, `guessed_count`, `guess_note` exist on `POST /food/photo/` (API_REFERENCE §8). Daily summary for the remaining value exists.

## How to verify
Log a photo meal and compare with frames 21a and 21b.

## Definition of done (from the acceptance criteria)

- [ ] A photo log shows 21a, then 21b after saving.
- [ ] The guess note appears only when `guessed_count` is above zero.
- [ ] No invented number; "leaves N for dinner" comes from the daily summary.
