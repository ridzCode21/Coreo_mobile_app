# Product Brief — Coreo

Status: **ACTIVE DRAFT.** Product direction below reflects the founder's
current thinking as of 2026-07-07. Sections marked with a decision are real;
anything still open is called out explicitly in Assumptions/Open Questions —
do not treat silence as a decision.

## 1. Problem statement

Health-conscious users today stitch together separate apps for diet
(MyFitnessPal), fitness (Strava/Hevy), and wellness (Calm/Headspace), plus
whatever app their wearable vendor ships. None of these share context: a
diet app doesn't know you slept badly, a fitness app doesn't know you're
over your calorie target, a wellness app doesn't know you just ran 10k. The
user is left doing the cross-pillar reasoning themselves.

**Coreo's bet:** health outcomes improve when diet, fitness, and wellness
data — plus wearable signals and an AI assistant — reason about the user as
one person, not three unrelated logs. The product must _behave_ unified
(shared dashboard, shared assistant, cross-pillar signal use), not just be
three feature sets under one app icon.

## 2. Target users

TODO: no named persona/research yet. Working placeholder, to replace once
real user research or founder intent narrows this down:

| Persona                          | Goals                                                                                                | Pain points                                                                       | Notes                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| "Health optimizer" (placeholder) | Wants one place to see how sleep, training, and eating interact; not just log data but understand it | Juggling 2–4 apps today; none talk to each other; manual mental cross-referencing | Likely early-adopter, comfortable with tracking, moderate-to-high health literacy |

## 3. Core value proposition

One AI-aware health app where diet, fitness, and wellness data — and
eventually wearable data — inform each other and a single assistant reasons
across all three, instead of three isolated apps glued together by the user.

## 4. MVP scope

Full feature list and phasing lives in [feature-map.md](feature-map.md).
Summary of what MVP must prove: **the cross-pillar experience is real, not
marketing.** A user should be able to log across all three pillars and see
at least one place where that combined context visibly changes what the app
shows or says to them.

- [ ] Email-based signup/login (mock API backing)
- [ ] Food logging + calorie/macro tracking
- [ ] Basic AI-assisted meal planning (template/rule-based first pass — see
      architecture.md for what "AI-assisted" means before a real model is
      wired up)
- [ ] Workout logging + curated exercise library
- [ ] Wellness logging: sleep, mood, stress, mindfulness (manual entry)
- [ ] Unified home/dashboard surfacing all three pillars together — **this
      is the feature that proves the USP; treat it as non-negotiable for
      MVP even if individual pillar features are trimmed**
- [ ] Cross-pillar AI assistant/chatbot — MVP version can be a simpler,
      context-aware Q&A over the user's own logged data rather than a fully
      adaptive coaching engine (see feature-map.md for the coaching-vs-Q&A
      distinction)
- [ ] Mock API layer for all of the above (backend is incomplete — see
      architecture.md §4)
- [ ] Responsive layout that works on both phone and tablet form factors

## 5. Explicitly out of scope for MVP (future phases)

Per explicit direction, these are **future/later-phase** unless separately
approved — do not let them creep into MVP task planning:

- Wearable/fitness-tracker integration (Apple Health, Google Fit, Fitbit,
  Garmin, Whoop, etc.)
- Advanced/adaptive AI coaching (proactive multi-week programs, habit
  coaching loops) — MVP assistant is Q&A-over-your-data, not a coach
- Subscriptions / paywall / any monetization
- Lab result interpretation (bloodwork, biomarkers, clinical data) — see
  medical-safety note below, this one carries real risk if done carelessly
- Social login (Apple/Google sign-in) — email auth only for MVP
- Micro-nutrient tracking granularity (vitamins/minerals) — macro-level only
  for MVP
- Barcode/photo-based food logging (manual/search entry only for MVP)
- Social/community features (following, feeds, sharing) — not requested,
  not assumed

## 6. Medical/health safety posture

**Coreo provides wellness guidance, not medical diagnosis, and this must
hold at every layer** (product copy, AI assistant behavior, feature scope):

- The AI assistant must never phrase output as a diagnosis, prescription, or
  clinical recommendation.
- No feature should imply clinical-grade accuracy (e.g. calorie/macro
  estimates are estimates, not lab-verified figures).
- Lab result interpretation is explicitly future/deferred, and if it's ever
  built, it needs its own risk review before scoping — flagged here so it
  doesn't get bundled into "AI assistant" work casually.
- TODO: confirm target markets, since health-data handling obligations
  (HIPAA in the US, GDPR health-data provisions in the EU, etc.) depend on
  where users are and whether the app is positioned as wellness (lower bar)
  vs. clinical (much higher bar). Current assumption: **wellness/consumer
  positioning, not a clinical/medical device** — keep it that way unless
  explicitly decided otherwise.

## 7. Success metrics

TODO: no targets set yet. Proposed shape, given the cross-pillar USP —
replace numbers once there's a baseline:

- Activation: % of new signups who log in **at least 2 of the 3 pillars**
  within 48h (this is the metric that actually validates the USP, not just
  "logged something")
- Retention: % of users active in week 2 / week 4
- Cross-pillar engagement: % of weekly-active users who touch 2+ pillars in
  the same week
- AI assistant engagement: % of active users who send at least one assistant
  message per week

## 8. Platforms & constraints

- Target platforms: iOS and Android
- Form factors: phone **and tablet** (responsive layout requirement, not
  bespoke tablet-only screens for MVP — see design-system.md and
  architecture.md)
- Minimum OS versions: TODO
- Offline support: TODO for production; **not required during current mock-API
  development phase** since there's no real backend yet to be offline from
- Accessibility requirements: baseline rules in design-system.md §5 apply
  regardless of final visual design

## 9. Backend integration status

A real backend contract now exists ([`API_REFERENCE.md`](API_REFERENCE.md)) — this supersedes
the earlier "backend is incomplete" framing in §4 for _shape_, even though no live backend is
wired up yet. Decision (see [`implementation-plan.md`](implementation-plan.md) §0/§2/§3):

- Screens are built against a **mock API** that implements the real contract exactly (same
  request/response shapes, both envelope styles, auth token lifecycle) behind one env flag
  (`EXPO_PUBLIC_API_MODE`) — flipping to `live` should require zero feature-code changes.
- **Auth is mock-backed but built to the real contract now**, not deferred — register/login/
  refresh/logout all exist against `/users/*` shapes from day one.
- Several product-desired features have **no matching backend field/endpoint today** — tracked
  in [`feature-map.md`](feature-map.md) as flags F2–F5 (fitness/wellness onboarding capture,
  wellness logging beyond water, cross-pillar assistant, real wearable import). These are
  mock-only until the backend adds support; don't assume they're production-ready just because
  the mock makes them work end-to-end in the app.

## Assumptions

- Wellness/consumer positioning (not a regulated medical device) — see §6.
- Solo developer building this, at least through MVP — architecture and
  scope decisions should optimize for that (see architecture.md).
- MVP AI assistant = context-aware Q&A over the user's own data, not a
  trained coaching model — full adaptive coaching is future scope.
- "AI-powered diet planning" for MVP means rule/template-based suggestions
  dressed as AI-assisted, not necessarily a live LLM call, given mock-API-first
  development — see architecture.md §4 for how this gets built without a
  real backend or model integration yet.

## Open questions

- Business model / monetization timeline (subscriptions are future-scope,
  but is there a target model at all, even post-MVP?)
- Target launch date or milestone driving scope cuts?
- Target markets/regions (affects health-data compliance posture — see §6)
- Is tablet support a hard MVP requirement, or "should render acceptably"
  vs. a fully tailored tablet UX? Currently assumed: responsive layout that
  works well on both, not a separate tablet-specific design pass, for MVP.
- Wearable roadmap: which device(s) first, and roughly when — not needed for
  MVP, but affects how soon architecture.md's data-model needs to anticipate
  wearable data shapes.
- Which AI provider/model will eventually back the assistant and meal
  planning once this moves past mock APIs?
