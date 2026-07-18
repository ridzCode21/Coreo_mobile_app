# Feature map — Coreo

Referenced by [`product-context.md`](product-context.md). Seeded from
[`implementation-plan.md`](implementation-plan.md) §1 — the canonical feature ↔ API ↔ design
mapping. Update this file (not just the plan) as features land or scope changes; the plan doc is
a point-in-time build plan, this file is meant to stay current.

Feature folders live under `src/features/*` per [`architecture.md`](architecture.md) §2. Design
screen codes are searchable in `designs/reference/screens-source.html` by `data-screen-label`.

| Feature module     | API_REFERENCE sections                                                                     | Design screens (codes)                                                                                            | MVP?                                                      | Status                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `splash`           | none                                                                                       | Custom animated splash                                                                                            | ✅                                                        | ✅ Built (Phase 1)                                                              |
| `onboarding`       | §5 diet-profile (PUT), §3 register                                                         | First-open (20a/24a); 7a·1–7a·8 core setup; 12a·1–12a·6 diet interview; 16a·1–16a·5 fitness; 17a·1–17a·5 wellness | ✅ (diet fields); ⚠️ fitness/wellness = mock-only, see F2 | 🚧 First-open built (Phase 1); onboarding questions = Phase 3                   |
| `auth`             | §3 auth (register/login/refresh/logout), §6 verify, §7 password                            | 8a Save your core, (login/return-user — F1)                                                                       | ✅                                                        | 🚧 Placeholder login screen only; reconciliation to the real contract = Phase 2 |
| `home` (dashboard) | §10 GET `/daily-summary/`, `/insights/`, §15 `/core/config/`                               | 24b Home · sky glass (petal cluster — **canonical**), 10a composed, 10b calibrating                               | ✅ **USP-critical**                                       | ⬜ Phase 4                                                                      |
| `nutrition`        | §8 food, §12 meal-plans, §13 meal actions, §14 assistant                                   | 14a Diet home, 14b Log a meal, 15a Check my math, 15b Your usuals, 15c Week in review                             | ✅                                                        | ⬜ Phase 5                                                                      |
| `fitness`          | §9 exercise                                                                                | 16b Fitness home, 16c Quick loop                                                                                  | ✅                                                        | ⬜ Phase 6                                                                      |
| `wellness`         | §10 `/daily-summary/water/` PATCH; DailyLog sleep/hrv/steps                                | 17b Wellness home, 17c Right now                                                                                  | ⚠️ partial — no mood/stress/mindfulness endpoint, see F3  | ⬜ Phase 6                                                                      |
| `assistant`        | §14 meal assistant                                                                         | 18c Chat presence (presence orb)                                                                                  | ⚠️ meal_plan context only, see F4                         | ⬜ Phase 7                                                                      |
| `insights`         | §10 `/insights/`, `/insights/generate/`                                                    | Smart Insight cards (home), 27a lock-screen (later)                                                               | ✅ (gated: ≥30 days data)                                 | ⬜ Phase 7                                                                      |
| `profile`          | §4 profile/update/delete, §5 diet-profile GET, §6 verify, §7 password, §15 contact-support | 19a Profile, 19b What Coreo knows                                                                                 | ✅                                                        | ⬜ Phase 7                                                                      |
| `import`           | §11 data import                                                                            | 7a·5 Sources (partial)                                                                                            | ⚠️ wearable/export import deferred, mock-only, see F5     | ⬜ Later                                                                        |
| `paywall`          | (none — billing out of scope)                                                              | 26a/26b Coreo Plus                                                                                                | ⬜ deferred                                               | ⬜ Phase 7 (UI only)                                                            |
| shared/`core`      | §15 health-check/app-info/config, §16 quota                                                | app-wide (config on boot; error/empty states 25a–25c)                                                             | ✅                                                        | 🚧 Mock transport/router built (Phase 0); no config-on-boot fetch yet           |
| notifications      | (OS-rendered)                                                                              | 27a/27b/27c lock screen                                                                                           | ⬜ later                                                  | ⬜ Later                                                                        |

## Open flags (design ↔ API ↔ scope mismatches)

Carried from `implementation-plan.md` §1 — resolve during the referenced phase, don't silently
build around them:

- **F1 — Return-user login screen.** No standalone login screen in the 57-screen export (8a is
  the register moment). Decide at Phase 2.
- **F2 — Fitness/wellness onboarding answers have no API home.** Mock-only capture until the
  backend adds fields.
- **F3 — Wellness logging endpoints missing** beyond `water_ml` PATCH and read-only sleep/hrv.
  Mock the writes; flag the backend gap.
- **F4 — Assistant is meal-only.** MVP = meal-plan assistant on the real API + a mock Q&A for the
  presence/chat screen; don't imply cross-pillar reasoning the backend can't do yet.
- **F5 — Import = deferred wearable scope.** Build the "Sources" UI only; mock the import task
  lifecycle.
- **F6 — Two response envelopes** (Style A wrapped vs. Style B bare) — the client + mock handle
  both per-route; see `architecture.md` §4.
- **F7 — This file.** Was referenced by `product-context.md` before it existed; now it exists.
