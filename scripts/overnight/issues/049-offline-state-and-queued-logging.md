# 049 - Offline state and queued logging

| Field | Value |
| --- | --- |
| GitHub | https://github.com/ridzCode21/Coreo_mobile_app/issues/49 |
| Type | enhancement |
| Size | big |
| Screens | 25c |
| Labels | enhancement, size:big, area:frontend |

## Summary
The app has no offline behaviour. The design keeps showing the last known day and queues meals until the phone is back online.

## Design reference
Design file: `Coreo Design System Rebuild/Coreo App Screens.dc.html` (shared design folder, not in the repo). Screens: 25c.
Home with the line "No connection. Today is cached from 2:14 PM.", an "As of 2:14 PM" label, an offline wave, pillar values shown as "—", and "Log anything — I'll sync the moment we're back." Design lines 2893-2954.

## Current behavior
- No network detection (`NetInfo`), no saved query cache and no queue for changes. A search of `src` and `package.json` finds none.

## What to change
- Detect the connection, save the TanStack Query cache to storage so the last day shows offline, and queue log changes until the connection returns.
- Show the design banner and "As of" time. The wave must not draw past the cached time (no invented values).
- Flag any new package (network info, cache persistence) to the owner first.

## Acceptance criteria
- [ ] With the network off, home shows the cached day with the offline banner.
- [ ] A meal logged offline is saved and sent when the network returns.
- [ ] Nothing invented appears.

## Backend dependency
None; this is client work.

## How to verify
Turn on airplane mode after opening home, log a meal, turn it off and check it syncs.

## Definition of done (from the acceptance criteria)

- [ ] With the network off, home shows the cached day with the offline banner.
- [ ] A meal logged offline is saved and sent when the network returns.
- [ ] Nothing invented appears.
