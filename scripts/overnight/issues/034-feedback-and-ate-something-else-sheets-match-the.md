# 034 - Feedback and "ate something else" sheets match the design

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/34 |
| Type | bug |
| Size | big |
| Screens | 29d, 31a |
| Labels | bug, size:big, area:frontend |

## Summary
The two sheets have different copy and options from the design, and "ate something else" sends a protein number the user never gave.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 29d, 31a.
29d "How was it? Helps me plan better tomorrow." Six options in two columns (Loved it, Too heavy, Too light, Too much cooking, Too pricey, Not available), placeholder "Anything else? Optional.", button "Send feedback". 31a "Ate something else? No plan needed — I'll still count it." input "e.g. leftover pizza, two slices", label "About how much?", three equal chips (~300, ~500, ~700), button "Log it — that's dinner", note "Carbs and fat default to zero unless you tell me more." Design lines 3473-3501 and 3640-3681.

## Current behavior
- `src/features/nutrition/screens/MealDetailScreen.tsx:523-564` (29d): title "How did this land?", no body line, placeholder "Optional note", button "Save feedback" (`:543`, `:557`, `:561`). Eight wrapped chips (`:50-59`) including "Not for me" and "Something else", and the labels "Too expensive" and "Couldn't find items" instead of "Too pricey" and "Not available".
- `src/features/nutrition/screens/MealDetailScreen.tsx:566-612` (31a): the body, placeholder and chips ("~300 kcal") differ (`:589`, `:595`, `:609`); the "About how much?" label, the note and the send button are missing; chips wrap instead of three equal chips; the button says "Log it" with no meal name. The code sends `approx_protein_g = Math.round(outsideCalories * 0.08)` (`:184`), which is an invented number.

## What to change
- Match both sheets to the design copy and layout, with the dynamic meal name in the 31a button.
- Map the six feedback options to backend feedback values; ask the backend owner what to do with the two extra values.
- Do not send an invented protein value. Send zero or leave it empty if the API allows it, as the design note says "Carbs and fat default to zero".

## Acceptance criteria
- [ ] Both sheets match the design.
- [ ] No made-up nutrition number is sent.
- [ ] The button text uses the real meal type.

## Backend dependency
`POST .../feedback/` and `POST /meal-plans/{date}/ate-something-else/` exist (API_REFERENCE §13). The API requires `approx_protein_g` (line 1513); ask for it to become optional, or agree to send 0, so the app never invents a value.

## How to verify
Submit each sheet in live mode and check the request body.

## Definition of done (from the acceptance criteria)

- [ ] Both sheets match the design.
- [ ] No made-up nutrition number is sent.
- [ ] The button text uses the real meal type.
