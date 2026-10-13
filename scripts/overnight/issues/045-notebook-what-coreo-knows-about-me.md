# 045 - Notebook: what Coreo knows about me

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/45 |
| Type | enhancement |
| Size | big |
| Screens | 19b |
| Labels | enhancement, size:big, area:frontend |

## Summary
There is no screen where users can read, correct or delete what Coreo remembers about them.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 19b.
"Coreo's notebook - What I know about you. **Correct me anytime.**" Fact rows with the sentence, a source line ("From your interview · March") and an optional "New" badge; each can be edited or deleted. Footer "This is everything I hold… Delete it all and we start clean." and a link "Something I got wrong? Tell me". Design lines 2670-2740.

## Current behavior
- Not built. A search of `src` for the endpoint names and screen copy finds nothing.

## What to change
- Build the list from `GET /users/me/memory-facts/`; edit with PATCH and delete with DELETE (one fact) and DELETE on the list (all).
- Design the empty state with the owner: facts are not created automatically from the interview yet, so a new user sees an empty notebook.
- "Something I got wrong? Tell me" has no backend target; leave it out or open it as chat once chat exists.

## Acceptance criteria
- [ ] Facts are listed with their source.
- [ ] A fact can be corrected and deleted.
- [ ] "Delete it all" asks for confirmation and clears the list.

## Backend dependency
The routes exist (API_REFERENCE §5, lines 735-781; backend issue vipin4250/Self_dev#31, closed). Facts are not extracted from interview notes (`docs/mvp.md`; backend issue vipin4250/Self_dev#49 is open), and there is no create route.

## How to verify
Create facts through the dev server and edit and delete them from the screen.

## Definition of done (from the acceptance criteria)

- [ ] Facts are listed with their source.
- [ ] A fact can be corrected and deleted.
- [ ] "Delete it all" asks for confirmation and clears the list.
