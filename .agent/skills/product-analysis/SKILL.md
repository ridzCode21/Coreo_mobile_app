---
name: product-analysis
description: >-
  Analyze a feature request or task like a product owner before any planning or coding happens —
  target user, job-to-be-done, competitive/market behavior in fitness apps, MVP slice vs. later
  iteration. Use at the start of any non-trivial feature or product request.
disable-model-invocation: true
---

# Product Analysis

## Instructions

Before scoping or planning any non-trivial feature, work through this:

1. **Read `docs/product-context.md`.** If it already answers who the user is and why this
   feature matters, use that. If it's still a skeleton for the relevant part, don't skip the
   thinking — do it inline and flag it as an assumption (see step 5).
2. **Name the user and the job.** Who specifically is using this feature, and what job are they
   trying to get done? ("Log a completed workout in under 30 seconds so I don't lose the streak"
   is a job; "add a workout logging screen" is not.)
3. **Check market behavior.** How do comparable fitness apps (Strava, Fitbod, Nike Training
   Club, Hevy, MyFitnessPal, Whoop) handle this same job? Note the pattern that's converged on as
   an industry default (it's usually there for a reason — reduced onboarding friction, habit
   loops, etc.) and decide whether to follow it or deliberately deviate. Deviating is fine — but
   it should be a decision, not an accident.
4. **Split MVP vs. later.** What's the smallest version that delivers the job-to-be-done end to
   end? Defer variants, edge-case polish, and secondary flows to a clearly labeled "later"
   bucket rather than building everything at once.
5. **Surface assumptions.** If you filled gaps `docs/product-context.md` didn't cover, state
   them explicitly in your response (e.g. "Assuming this is for intermediate lifters following a
   program, not casual step-counters — flag if that's wrong") and suggest updating the doc.

## Output

A short analysis (a few sentences to a short list, not an essay) covering: user + job, relevant
market pattern followed or deviated from, MVP slice, and any assumptions made. Hand this
directly into `.agent/skills/feature-planning/SKILL.md`.
