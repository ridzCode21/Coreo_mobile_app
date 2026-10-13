# 039 - Fitness interview: five questions

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/39 |
| Type | enhancement |
| Size | big |
| Screens | 16a·1, 16a·2, 16a·3, 16a·4, 16a·5 |
| Labels | enhancement, size:big, area:frontend |

## Summary
Choosing Fitness during onboarding leads nowhere. The Fitness tab is a "coming soon" placeholder and the five Fitness questions do not exist.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 16a·1, 16a·2, 16a·3, 16a·4, 16a·5.
16a·1 "What are we building?" (Get stronger, Build muscle, Lose fat, keep muscle, Move better, more energy, A race or event; "One goal at a time. We can change it any month."). 16a·2 "Where will this actually happen? I only build with what you have." (A full gym, Home, dumbbells and a band, Just my bodyweight, Outdoors, mostly; pick more than one). 16a·3 "Tell me what moving looks like now..." voice capture with a timer, a transcript and "Heard so far" chips. 16a·4 "Do you play anything? Sport counts as training." (Cricket, Football, Badminton, Running, Swimming, Nothing regular). 16a·5 "Last one. Anything we train around?" (Lower back, Knees, Shoulders, Wrists, Nothing to flag) with the button "Build my training week". Design lines 1821-2014.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing. `src/app/(app)/(tabs)/fitness/index.tsx` renders `PillarComingSoonScreen`. `src/shared/components/VoiceInputBar.tsx` exists and can be reused.

## What to change
- Build the five steps with the design copy and save with `PUT /users/me/fitness-profile/` (partial updates are fine).
- Start the interview from the first time the user opens the Fitness tab, or from onboarding if the owner wants it there.
- 16a·3: the server does not turn speech into text or tags. Either record the text on the device and send it as the movement note, or drop the "Heard so far" chips for now. Raise this with the owner before building; adding a speech library needs a heads-up.

## Acceptance criteria
- [ ] All five steps exist with design copy and the right single or multiple choice rules ("Nothing regular" and "Nothing to flag" are exclusive).
- [ ] Answers are saved to the fitness profile and survive a restart.
- [ ] Finishing the last step leads to the training week screen.

## Backend dependency
`GET/PUT /users/me/fitness-profile/` exist (API_REFERENCE §5, lines 436-474; backend issue vipin4250/Self_dev#25, closed). The server does not transcribe audio or extract chips (lines 457-458); turning spoken notes into tags is backend issue vipin4250/Self_dev#49 (open).

## How to verify
Run the five steps in live mode and check the stored profile.

## Definition of done (from the acceptance criteria)

- [ ] All five steps exist with design copy and the right single or multiple choice rules ("Nothing regular" and "Nothing to flag" are exclusive).
- [ ] Answers are saved to the fitness profile and survive a restart.
- [ ] Finishing the last step leads to the training week screen.
