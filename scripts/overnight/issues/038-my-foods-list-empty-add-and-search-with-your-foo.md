# 038 - My foods: list, empty, add and search with your foods

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/38 |
| Type | enhancement |
| Size | big |
| Screens | 32a, 32b, 32c, 32d |
| Labels | enhancement, size:big, area:frontend |

## Summary
People cannot save their own foods. The design has four screens for it. Listing foods needs a backend change first.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 32a, 32b, 32c, 32d.
32a "My foods - Yours, kept separate from the shared catalog." rows "Mom's dal - 182 kcal · 9g protein · 22g carbs · 6g fat — per 100g", footer "4 foods · only you can see these". 32b "No custom foods yet" "Save your own recipes and staples with their macros. I'll remember them in Search and while logging." button "Add a food". 32c "Add a food - Per 100 grams — I'll scale it wherever you use it." Name, Calories, Protein, Carbs, Fat, "Save to my foods". 32d "Search" with "Tap a result to log it." and rows with "OpenFoodFacts" labels (your own foods have none). Design lines 3682-3837.

## Current behavior
- No My foods screens. `POST /food/items/` is never called. Search exists only inside the log sheet (`src/features/nutrition/api/nutritionApi.ts:67`, `src/features/nutrition/components/FoodSearchList.tsx:18`); it has no standalone screen and does not show "Tap a result to log it." or source labels.

## What to change
- Build 32c (add a food) and 32d (search screen with source labels) now: `POST /food/items/` and `GET /food/search/` exist (own foods come first, source `custom`).
- Build 32a and 32b once a list endpoint exists.
- Handle a duplicate barcode (400) and a search outage (503) with calm copy; the design shows neither.

## Acceptance criteria
- [ ] A user can save a food and find it in search.
- [ ] Search rows show the OpenFoodFacts label for catalog items.
- [ ] The list and empty screens exist after the backend list endpoint ships.

## Backend dependency
`POST /food/items/` and `GET /food/search/` exist (API_REFERENCE §8). Missing: `GET /food/items/` (list) and edit/delete for custom foods (endpoint index, lines 1856-1862). Needs a new backend issue; there is none yet. The saved foods only appear in the data export today.

## How to verify
Add a food, search for it, and compare with frames 32c and 32d.

## Definition of done (from the acceptance criteria)

- [ ] A user can save a food and find it in search.
- [ ] Search rows show the OpenFoodFacts label for catalog items.
- [ ] The list and empty screens exist after the backend list endpoint ships.
