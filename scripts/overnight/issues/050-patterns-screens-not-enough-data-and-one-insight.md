# 050 - Patterns screens: not enough data and one insight

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/50 |
| Type | enhancement |
| Size | big |
| Screens | 37a, 37b |
| Labels | enhancement, size:big, area:frontend |

## Summary
There is no Patterns screen. The backend returns insights only after enough days are logged.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 37a, 37b.
37a "Patterns - Calibrating" with a wave, "22 of 30 days", "Real soon", "Patterns take time to see clearly. Once you've logged consistently for about a month, I'll start pointing out what seems connected." and "Not medical advice — just what I notice in your own numbers." 37b chips Sleep and Steps, "A pattern worth watching", "On nights you sleep under 6 hours, you seem to take about 1,800 fewer steps the next day.", "Based on the last 6 weeks. May be worth watching, not a rule." Design lines 4050-4376.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing.

## What to change
- Build 37a from `GET /insights/` status `not_enough_data` (`days_logged`, `days_remaining`) with a dashed wave.
- Build 37b from the insight list. Show the backend's `insight_text`; do not add numbers the API does not provide ("1,800 fewer steps", "under 6 hours", "6 weeks"). Map `col_x` and `col_y` to chip labels.
- The status `no_insights` has no design; ask the design owner.

## Acceptance criteria
- [ ] 37a shows real day counts.
- [ ] 37b shows only API text and a disclaimer.
- [ ] No invented effect size.

## Backend dependency
`GET /insights/` exists (API_REFERENCE §10, lines 1263-1273). The effect size, threshold and time window shown in the design are not in the payload. Backend issue vipin4250/Self_dev#48 (open) decides the wording and fields.

## How to verify
Use mock data for both statuses and compare with frames 37a and 37b.

## Definition of done (from the acceptance criteria)

- [ ] 37a shows real day counts.
- [ ] 37b shows only API text and a disclaimer.
- [ ] No invented effect size.
