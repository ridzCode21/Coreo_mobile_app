# 041 - Wellness interview: five questions

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/41 |
| Type | enhancement |
| Size | big |
| Screens | 17a·1, 17a·2, 17a·3, 17a·4, 17a·5 |
| Labels | enhancement, size:big, area:frontend |

## Summary
Choosing Wellness leads to a "coming soon" tab. The five Wellness questions do not exist.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 17a·1, 17a·2, 17a·3, 17a·4, 17a·5.
17a·1 "What weighs on you most, right now? One thing. We start there." (Sleep, A racing mind, Work stress, Low energy, Mood dips). 17a·2 "Tell me about your nights..." voice capture with "Heard so far" chips. 17a·3 "What's the first thing you do when you wake up?" (Straight to the bathroom, Check my phone, Tea or coffee first, Snooze, twice, Rush straight out). 17a·4 "What already helps, even a little?" (Walks, Music, Chai on the balcony, Prayer, Talking it out, Haven't found it; "No mandatory meditation."). 17a·5 "Last one. How should check-ins work?" ("Step in before it builds" or "Only when I come to you", and the toggle "Spare me the numbers"), button "Build my evenings". Design lines 2149-2348.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `src/app/(app)/(tabs)/wellness/index.tsx` renders `PillarComingSoonScreen`.

## What to change
- Build the five steps and save with `PUT /users/me/wellness-profile/`.
- 17a·2 has the same speech issue as the Fitness interview: the server does not extract chips. Decide with the owner.
- The check-in choice decides whether the evening nudge is sent (`step_in`), so say so clearly in the copy the design gives.

## Acceptance criteria
- [ ] All five steps exist with design copy.
- [ ] "Haven't found it" is exclusive.
- [ ] Answers are saved and the next screen is Wellness home.

## Backend dependency
`GET/PUT /users/me/wellness-profile/` exist (API_REFERENCE §5, lines 529-570; backend issue vipin4250/Self_dev#26, closed). Turning spoken notes into tags is backend issue vipin4250/Self_dev#49 (open).

## How to verify
Run the five steps in live mode and check the stored profile.

## Definition of done (from the acceptance criteria)

- [ ] All five steps exist with design copy.
- [ ] "Haven't found it" is exclusive.
- [ ] Answers are saved and the next screen is Wellness home.
