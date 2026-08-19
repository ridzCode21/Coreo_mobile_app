# Feature map — Coreo

Referenced by [`product-context.md`](product-context.md). Seeded from
[`implementation-plan.md`](implementation-plan.md) §1 — the canonical feature ↔ API ↔ design
mapping. Update this file (not just the plan) as features land or scope changes; the plan doc is
a point-in-time build plan, this file is meant to stay current.

Feature folders live under `src/features/*` per [`architecture.md`](architecture.md) §2. Design
screen codes are searchable in `designs/reference/screens-source.html` by `data-screen-label`.

| Feature module     | API_REFERENCE sections                                                                     | Design screens (codes)                                                                                                                                                                                                                                             | MVP?                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `splash`           | none                                                                                       | Custom animated splash                                                                                                                                                                                                                                             | ✅                                                        | ✅ Built (Phase 1)                                                                                                                                                                                                                                                                                                                                                                    |
| `onboarding`       | §5 diet-profile (PUT, one-shot), §3 register (incl. `date_of_birth`/`gender`)              | First-open (20a/24a); 7a·1–7a·8 core setup (goal now asked inline with the diet interview, not a separate 7a·2); 12a·1–12a·6 diet interview + 4 net-new (cuisine/activity/budget/health); new "calibrating" wave screen; 16a·1–16a·5 fitness; 17a·1–17a·5 wellness | ✅ (diet fields); ⚠️ fitness/wellness = mock-only, see F2 | 🚧 Unified value-first/signup-last flow built (`onboarding-v2-flow-plan.md`): First-open → name → goal → about-you (age/height/weight) → gender (own screen) → pillars → full diet interview (D1–D10) → promise → calibrating → save/register (**last** step) → `(app)`. Draft persists locally (resumes after app kill). 7a·8 Arrival + fitness/wellness interviews (16a/17a) remain |
| `auth`             | §3 auth (register/login/refresh/logout), §6 verify, §7 password                            | 8a Save your core, (login/return-user — F1)                                                                                                                                                                                                                        | ✅                                                        | 🚧 Register (mock `POST /users/register/`) now the **last** onboarding step, not a mid-flow gate — see `onboarding-v2-flow-plan.md`; placeholder `login.tsx` unreachable — F1 resolved for now (see below), real login UI deferred                                                                                                                                                    |
| `home` (dashboard) | §10 GET `/daily-summary/`, `/insights/`, §15 `/core/config/`                               | 24b Home · sky glass (petal cluster — **canonical**), 10a composed, 10b calibrating                                                                                                                                                                                | ✅ **USP-critical**                                       | ⬜ Phase 4                                                                                                                                                                                                                                                                                                                                                                            |
| `nutrition`        | §8 food, §12 meal-plans, §13 meal actions, §14 assistant                                   | 14a Diet home, 14b Log a meal, 15a Check my math, 15b Your usuals, 15c Week in review                                                                                                                                                                              | ✅                                                        | 🚧 Phase 5 — **Layer 1 built** (food logging + calorie/macro tracking: 14a Diet home, 14b Log a meal incl. photo + barcode, 15a-style confirm; §8 + §10, mock-backed). Diet home is the temporary `(app)` landing until Phase 4 Home (F-N3). **Layer 2 pending**: meal plans (§12), meal actions (§13), assistant (§14), 15b/15c. Photo + barcode now in MVP scope (F-N1). See `docs/superpowers/specs/2026-07-26-nutrition-food-logging-design.md`                                                                                                                                                                                                                                                                                                                                                                            |
| `fitness`          | §9 exercise                                                                                | 16b Fitness home, 16c Quick loop                                                                                                                                                                                                                                   | ✅                                                        | ⬜ Phase 6                                                                                                                                                                                                                                                                                                                                                                            |
| `wellness`         | §10 `/daily-summary/water/` PATCH; DailyLog sleep/hrv/steps                                | 17b Wellness home, 17c Right now                                                                                                                                                                                                                                   | ⚠️ partial — no mood/stress/mindfulness endpoint, see F3  | ⬜ Phase 6                                                                                                                                                                                                                                                                                                                                                                            |
| `assistant`        | §14 meal assistant                                                                         | 18c Chat presence (presence orb)                                                                                                                                                                                                                                   | ⚠️ meal_plan context only, see F4                         | ⬜ Phase 7                                                                                                                                                                                                                                                                                                                                                                            |
| `insights`         | §10 `/insights/`, `/insights/generate/`                                                    | Smart Insight cards (home), 27a lock-screen (later)                                                                                                                                                                                                                | ✅ (gated: ≥30 days data)                                 | ⬜ Phase 7                                                                                                                                                                                                                                                                                                                                                                            |
| `profile`          | §4 profile/update/delete, §5 diet-profile GET, §6 verify, §7 password, §15 contact-support | 19a Profile, 19b What Coreo knows                                                                                                                                                                                                                                  | ✅                                                        | ⬜ Phase 7                                                                                                                                                                                                                                                                                                                                                                            |
| `import`           | §11 data import                                                                            | 7a·5 Sources (partial)                                                                                                                                                                                                                                             | ⚠️ wearable/export import deferred, mock-only, see F5     | ⬜ Later                                                                                                                                                                                                                                                                                                                                                                              |
| `paywall`          | (none — billing out of scope)                                                              | 26a/26b Coreo Plus                                                                                                                                                                                                                                                 | ⬜ deferred                                               | ⬜ Phase 7 (UI only)                                                                                                                                                                                                                                                                                                                                                                  |
| shared/`core`      | §15 health-check/app-info/config, §16 quota                                                | app-wide (config on boot; error/empty states 25a–25c)                                                                                                                                                                                                              | ✅                                                        | 🚧 Mock transport/router built (Phase 0); no config-on-boot fetch yet                                                                                                                                                                                                                                                                                                                 |
| notifications      | (OS-rendered)                                                                              | 27a/27b/27c lock screen                                                                                                                                                                                                                                            | ⬜ later                                                  | ⬜ Later                                                                                                                                                                                                                                                                                                                                                                              |

## Onboarding — unified flow, goal + diet interview (D1–D10) + calibrating

Original per-question mapping/rationale in `onboarding-refinement-plan.md` Parts B–C;
**superseded by `onboarding-v2-flow-plan.md`** (goal became a direct question, one unified
sequencer, signup moved to the end) — condensed here since this file is the one meant to stay
current. The actual user-facing order (bespoke screens + diet-config questions interleaved) is
`FLOW_STEP_IDS` in `features/onboarding/lib/steps.ts`; the table below is just the diet-interview
portion of it:

| #   | Screen              | API field                                                                | Origin                                                                                |
| --- | ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| —   | Goal                | `goal_type` ⭑required, direct question (title uses the user's name)      | **net-new in v2** (was a separate, now-deleted 7a·2 Goals screen + derived heuristic) |
| D1  | 12a·1 Eating style  | `diet_type`                                                              | design                                                                                |
| D2  | 12a·2 Off the table | `allergies` (free-typed `disliked_foods` add removed for now, see below) | design                                                                                |
| D3  | Cuisine             | `cuisine_preference` ⭑required                                           | **net-new** (no design source)                                                        |
| D4  | 12a·3 Target        | `target_weight_kg` — only asked when the goal is weight-related          | design                                                                                |
| D5  | Activity            | `activity_level`                                                         | **net-new**                                                                           |
| D6  | 12a·4 Who cooks     | `cooking_frequency`                                                      | design (loose mapping, see F2 below)                                                  |
| D7  | 12a·5 Meal rhythm   | `meal_frequency`                                                         | design                                                                                |
| D8  | Budget              | `budget_tier`                                                            | **net-new**                                                                           |
| D9  | Health              | `health_conditions` (max 3)                                              | **net-new**                                                                           |
| D10 | 12a·6 Weak moment   | _(mock-only, no API field)_                                              | design                                                                                |

D3/D5/D8/D9 have no corresponding mockup in `screens-source.html` — built in the established
design-system style (glass `ToggleRow`/`SelectableChip` cards) to cover API fields the 57-screen
export doesn't have a dedicated screen for. After D10 and the bespoke `promise` screen, a
**calibrating** screen (`(public)/onboarding/diet/calibrating`) shows a `WaveChart` filling to the
diet profile's completeness % — computed straight from the local draft, not a `GET` call, since
the account doesn't exist yet at this point in the v2 flow — before handing off to **save**
(register, now the flow's last step) and then `(app)`. Question order/copy/options live in
`features/onboarding/lib/dietQuestions.ts` — a config array, not one file per question — but
_sequencing_ (what's next, which dot is active, conditional skips like D4) is owned by
`features/onboarding/lib/steps.ts`, not by this file — see `architecture.md` §5.1.

D2's `disliked_foods` free-text add (a `VoiceInputBar` stacked above the chip grid, itself above
the `NextBar`) is temporarily removed — three stacked glass bars on one screen didn't match the
design's one-footer-per-screen chrome (F10 below); the chip options (`allergies`) alone remain.

## Open flags (design ↔ API ↔ scope mismatches)

Carried from `implementation-plan.md` §1 — resolve during the referenced phase, don't silently
build around them:

- **F1 — Return-user login screen.** No standalone login screen in the 57-screen export (8a is
  the register moment). **Resolved for now:** every signed-out user (first-time or returning)
  lands on first-open → onboarding, not `(auth)/login` — see
  `features/splash/lib/resolveLaunchDestination.ts`. `(auth)/login.tsx` stays as unreachable
  scaffold for whenever a real return-user login screen is designed; revisit at Phase 2 if the
  product decision changes.
- **F2 — Fitness/wellness onboarding answers have no API home.** Mock-only capture until the
  backend adds fields. **Diet is now fully specced** (D1–D10 above, `PUT
/users/me/diet-profile/`) — this flag is scoped to the fitness (16a·_) and wellness (17a·_)
  interviews only, which remain unbuilt.
- **F3 — Wellness logging endpoints missing** beyond `water_ml` PATCH and read-only sleep/hrv.
  Mock the writes; flag the backend gap.
- **F4 — Assistant is meal-only.** MVP = meal-plan assistant on the real API + a mock Q&A for the
  presence/chat screen; don't imply cross-pillar reasoning the backend can't do yet.
- **F5 — Import = deferred wearable scope.** Build the "Sources" UI only; mock the import task
  lifecycle. **Superseded by `onboarding-v2-flow-plan.md` D1:** `SourcesScreen`/`ReadingScreen`
  were removed from the required onboarding path entirely (not just deferred functionality) to
  keep the interview to the value-first core — wearable/import connection now has no onboarding UI
  at all until it's redesigned as a standalone (likely post-onboarding, profile-area) flow.
- **F6 — Two response envelopes** (Style A wrapped vs. Style B bare) — the client + mock handle
  both per-route; see `architecture.md` §4.
- **F7 — This file.** Was referenced by `product-context.md` before it existed; now it exists.
- **F8 — Diet interview route group.** Lives under `(public)/onboarding/diet/*`.
  **Updated by `onboarding-v2-flow-plan.md`:** the diet-interview screens themselves no longer
  make any API calls (they read/write the local draft only, pre-signup); the single authenticated
  `PUT /users/me/diet-profile/` happens later, from `onboarding/save.tsx`, right after that same
  screen's register call signs the user in — so the "authenticated call from inside `(public)`"
  case now lives entirely in one screen rather than throughout `diet/*`. `(public)` vs. `(app)` in
  this codebase remains a **navigation** boundary (root `Stack.Protected` guard), not an
  auth-requirement boundary; auth is enforced by the API client attaching the bearer token, not by
  route placement. Kept in `(public)` for visual/navigation continuity with the rest of onboarding.
  See `architecture.md` §5.
- **F9 — "Who cooks" copy vs. `cooking_frequency` enum.** The design's answers ("I cook / Family
  cooks / House help") don't map cleanly onto `every_meal/once_daily/batch_cooking/
minimal_cooking`. Mapped loosely for now (`dietQuestions.ts`, D6) — revisit copy-to-enum
  alignment if it causes confusing mock target estimates.
- **F10 — D2 free-typed `disliked_foods` removed for now.** The design's "Anything your body
  refuses?" screen (12a·2) pairs a chip grid with a free-text bar in the same footer area; our
  generic `DietQuestionScreen` renders that as its own `VoiceInputBar` block stacked _above_ the
  screen's `NextBar` — two glass pill bars on one screen, which reads as a layout bug even though
  it's intentional stacking. Removed the `freeAddField`/`freeAddPlaceholder` config for D2
  (`allergies` chips alone remain); the `freeAddField` mechanism itself stays generic in
  `dietQuestions.ts`'s types for whenever a real two-footer (or combined-footer) treatment is
  designed, rather than deleting the feature outright.
- **F11 — `GET /food/lookup/barcode/:barcode/` mock is deliberately lenient.** §8 specs exact-match
  or 404; the mock additionally synthesizes a plausible generic `FoodItem` for any well-formed
  (6–14 digit) barcode that isn't one of the ~10 fake seeded codes in `mocks/fixtures.ts`, so
  scanning real packaging on-device always resolves to something loggable instead of dead-ending at
  404 (real products will essentially never match the fake seed data). Mock-only —
  `nutrition/mocks/handlers.ts`'s `synthesizeFoodItem`; the real API keeps the strict 404 behavior
  §8 describes, so this gap closes itself once a live OpenFoodFacts-backed endpoint exists.
