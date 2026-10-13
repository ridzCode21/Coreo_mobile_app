# 026 - Label scan result, servings and could-not-read screens

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/26 |
| Type | enhancement |
| Size | big |
| Screens | 21c, 21d, 25d |
| Labels | enhancement, size:big, area:frontend |

## Summary
Scanning a nutrition label has no result screens. The design lets you choose how many servings you ate and gives a calm recovery when the label cannot be read.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 21c, 21d, 25d.
21c "Label · Snack - Read it straight off the panel. **Check it.**" with the product, kcal, "1 bar (68g) · 2.5 servings per container", "How much did you eat?" and per-serving macros. 21d sheet "How many servings?" "The container has 2.5 · 1 serving = 68g." with a slider (1.0x to 2.5x whole container), a live total line and "Save serving". 25d "I couldn't read that label. Too blurry, maybe. Describe it and I've got you." with "Describe it", "Scan barcode instead", "Try another photo", "Nothing was logged yet." Design lines 1670-1798.

## Current behavior
- None of the three screens exists. `POST /food/label-ocr/` is never called (see "Nutrition label option reads the label with the label scanner").

## What to change
- Build 21c with the label result and the servings control, 21d as a sheet, and 25d for a 422 from label OCR.
- Scale the macros from the label per serving; use `servings_per_container` from the response.
- Link the three recovery actions to describe, barcode and a new photo.

## Acceptance criteria
- [ ] A readable label shows 21c and saves the chosen servings.
- [ ] The 21d sheet scales macros without estimating.
- [ ] A 422 shows 25d and nothing is saved.

## Backend dependency
`POST /food/label-ocr/` exists with `servings_per_container` and a 422 for unreadable labels (API_REFERENCE §8, lines 1155-1175).

## How to verify
Scan a clear label and a blurry one in live mode and compare with frames 21c, 21d and 25d.

## Definition of done (from the acceptance criteria)

- [ ] A readable label shows 21c and saves the chosen servings.
- [ ] The 21d sheet scales macros without estimating.
- [ ] A 422 shows 25d and nothing is saved.
