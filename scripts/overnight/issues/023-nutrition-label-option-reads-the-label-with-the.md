# 023 - Nutrition label option reads the label with the label scanner

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/23 |
| Type | bug |
| Size | small |
| Screens | 14b |
| Labels | bug, size:small, area:frontend |

## Summary
In the "Log a meal" sheet the "Nutrition label" tile does the same thing as "Snap the plate". It sends the picture to the plate photo endpoint, so labels are read as food.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 14b.
14b lists four ways to log: "Snap the plate - I read the whole meal", "Scan barcode - Packaged anything", "Nutrition label - I digitize the fine print", "Describe it - Type or talk it out". Design lines 1296-1364.

## Current behavior
- `src/features/nutrition/components/LogMealSheet.tsx:201` sets `onPress={runPhoto}` on the label tile, the same handler as Snap (`:187`). That calls `POST /food/photo/` and confirms with source `photo` (`:158`).
- `FoodSource` in `src/shared/types/food.ts:9` is `'photo' | 'barcode' | 'manual' | 'import' | 'plan'`. It has no `label_ocr` or `quick_add`, and it includes `plan`, which the API says is not accepted on create (API_REFERENCE §8, line 960).
- `POST /food/label-ocr/` is never called anywhere in `src`.

## What to change
- Add a label-scan call to `POST /food/label-ocr/` and use it from the label tile.
- Fix `FoodSource` so it matches the API (`label_ocr`, `quick_add`; remove `plan` from create values).
- Hand the result to the label result screens (see "Label scan screens" issue); until they exist, send the user to the existing confirm screen with the label values.

## Acceptance criteria
- [ ] The label tile calls `/food/label-ocr/`, not `/food/photo/`.
- [ ] The saved entry has source `label_ocr`.
- [ ] `FoodSource` matches API_REFERENCE §8.
- [ ] The mock has a label-ocr handler.

## Backend dependency
`POST /food/label-ocr/` exists (backend issue vipin4250/Self_dev#1, closed). No backend change.

## How to verify
Scan a nutrition label in live mode and check the request goes to `/food/label-ocr/`.

## Definition of done (from the acceptance criteria)

- [ ] The label tile calls `/food/label-ocr/`, not `/food/photo/`.
- [ ] The saved entry has source `label_ocr`.
- [ ] `FoodSource` matches API_REFERENCE §8.
- [ ] The mock has a label-ocr handler.
