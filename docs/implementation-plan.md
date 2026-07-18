# Implementation Plan — Coreo (design → screens, mock-first)

Status: **PROPOSED (plan only, no code yet).** Owner: Jarvis. Date: 2026-07-19.

Purpose: turn the finished design (57-screen "Sky/Wave" export) into shipped React
Native screens whose **visuals come from the design system** and whose **logic/data
comes from `API_REFERENCE.md`**, using a **mock API** for now so the swap to the real
backend is a one-flag change later. This plan follows the `AGENTS.md` §5 decision
framework (product-analysis → feature-planning → architecture) and the two `.agent/skills`
playbooks. It ends with a concrete first experiment: the **custom animated splash**.

> How to read this: §1 is the feature↔API↔screen map, §2 is the mock architecture,
> §3 is mock-backed auth, §4 is the phased build order, §5 is the splash mini-plan
> (what we build first), §6 is required doc changes, §7 is open decisions.

---

## 0. Confirmed decisions (from kickoff)

1. **First experiment = custom animated splash** — a branded animated wave-logo intro
   that plays before the "First open" screen (not just the OS splash, not only a static
   First-open screen).
2. **Mock layer = scalable/standard.** Implemented at the existing shared `apiClient`
   seam as a per-feature handler registry toggled by one env flag (see §2). No feature
   code knows whether it's talking to mock or live.
3. **Auth is built now, mock-backed.** The mock issues real-shaped access/refresh tokens
   and enforces them, so the whole auth flow (register/login/refresh/logout) is
   implemented against the real contract from day one (see §3).

---

## 1. Feature categorization (API ↔ feature module ↔ design screens)

Feature folders live under `src/features/*` per `architecture.md` §2. Each row ties a
feature to its API section(s) and the design screen codes (search
`designs/reference/screens-source.html` by the `data-screen-label` code).

| Feature module | API_REFERENCE sections | Design screens (codes) | MVP? |
|---|---|---|---|
| `auth` | §3 auth (register/login/refresh/logout), §6 verify, §7 password | 20a/24a First open, 8a Save your core, (login/return-user — see flag F1) | ✅ |
| `onboarding` | §5 diet-profile (PUT), §3 register | 7a·1–7a·8 core setup, 12a·1–12a·6 diet interview, 16a·1–16a·5 fitness, 17a·1–17a·5 wellness | ✅ (diet fields); ⚠️ fitness/wellness fields = mock-only, see F2 |
| `home` (dashboard) | §10 GET `/daily-summary/`, §10 `/insights/`, §15 `/core/config/` | 24b Home · sky glass (petal cluster — **canonical**), 10a composed, 10b calibrating | ✅ **USP-critical** |
| `nutrition` | §8 food, §12 meal-plans, §13 meal actions, §14 assistant | 14a Diet home, 14b Log a meal, 15a Check my math, 15b Your usuals, 15c Week in review | ✅ |
| `fitness` | §9 exercise (exercises + entries) | 16b Fitness home, 16c Quick loop | ✅ |
| `wellness` | §10 `/daily-summary/water/` PATCH; DailyLog carries sleep/hrv/steps | 17b Wellness home, 17c Right now | ⚠️ partial — mood/stress/mindfulness logging has **no endpoint**, see F3 |
| `assistant` | §14 meal assistant (`/meals/assistant-prompts/`, `/assistant/`, `/confirm/`) | 18c Chat presence (presence orb) | ⚠️ meal_plan context only; cross-pillar chat has no API, see F4 |
| `insights` | §10 `/insights/`, `/insights/generate/` | Smart Insight cards (home), 27a lock-screen (OS, later) | ✅ (gated: needs ≥30 days data) |
| `profile` | §4 profile/update/delete, §5 diet-profile GET, §6 verify, §7 password, §15 contact-support | 19a Profile, 19b What Coreo knows | ✅ |
| `import` | §11 data import (`/import/`, poll) | 7a·5 Sources (partial) | ⚠️ wearable/export import = deferred scope, mock-only, see F5 |
| `paywall` | (none — billing out of scope) | 26a/26b Coreo Plus | ⬜ deferred (build screen, no billing) — design-system §9 |
| shared/`core` | §15 health-check/app-info/config, §16 quota | app-wide (config on boot; error/empty states 25a–25c) | ✅ |
| notifications | (OS-rendered) | 27a/27b/27c lock screen | ⬜ later (Live Activities / notifications) |

### Flags to resolve during build (design ↔ API ↔ scope mismatches)

- **F1 — Return-user login screen.** The design starts at First-open/onboarding; there's
  no explicit standalone email/password *login* screen in the 57 (8a "Save your core" is
  the *register* moment). The scaffold has `(auth)/login.tsx`. Decide: does 8a double as
  sign-in-or-register, or do we design a small login screen not in the export? (Low risk,
  decide at Phase 2.)
- **F2 — Fitness/wellness onboarding answers have no API home.** `diet-profile` (§5) is
  diet-centric (goal/activity/diet/cuisine/allergies/cooking/budget/health_conditions).
  The 16a·* (gear, sports) and 17a·* (nights, what helps, check-ins) answers have no
  matching backend field. Treat as **mock-only capture** now; flag for the backend team to
  add a profile section, or scope out of MVP onboarding.
- **F3 — Wellness logging endpoints missing.** Product context wants manual sleep/mood/
  stress/mindfulness. API only exposes `water_ml` PATCH and read-only DailyLog
  sleep_hours/hrv. Mock the wellness log writes; flag backend gap.
- **F4 — Assistant is meal-only.** §14 assistant is scoped to `context=meal_plan`. The
  product USP is a *cross-pillar* assistant. MVP = meal-plan assistant on the real API +
  a mock "Q&A over your own logged data" for the presence/chat screen; do not imply
  cross-pillar reasoning the backend can't do yet.
- **F5 — Import = deferred wearable scope.** §11 import (apple_health/mfp/strava) maps to
  wearable/data-import which product-context §5 defers. Build 7a·5 "Sources" as UI only;
  mock the import task lifecycle; don't wire real file upload for MVP.
- **F6 — Two response envelopes.** Users/core apps use **Style A** (`{success,data,message}`);
  food/exercise/insights/meals use **Style B** (bare payload). The client + mock must
  handle both per-route (see §2/§3).
- **F7 — `docs/feature-map.md` is referenced but missing.** `product-context.md` links to
  `docs/feature-map.md` twice; the file doesn't exist. This §1 table is the seed for it —
  create it as part of the doc updates (§6).

---

## 2. Mock API architecture (scalable + standard)

**Goal:** feature/query code is written against the real contract; flipping one env var
switches the whole app between mock and live with zero feature-code changes.

**Chosen approach — mock router behind the shared client seam.** The existing
`shared/api/client.ts` already centralizes every request (`architecture.md` §4). We insert
a swappable transport there:

```
shared/api/
  client.ts            # unchanged public surface (get/post/patch/delete)
  transport/
    index.ts           # picks live vs mock from env (EXPO_PUBLIC_API_MODE)
    liveTransport.ts    # the current fetch() path
    mockTransport.ts    # matches method+path against the mock router, returns a Response-like
  mock/
    router.ts          # registry: [method, pathPattern] -> handler(req) => {status, body, delay}
    db.ts              # in-memory seeded store (users, entries, plans, daily logs, quotas)
    envelope.ts        # helpers to wrap Style A / return Style B per route
    tokens.ts          # issue/verify mock access+refresh, blacklist on logout
features/<feature>/mocks/
    handlers.ts        # that feature's mock endpoints (colocated with the feature)
    fixtures.ts        # seed data shaped exactly like API_REFERENCE objects
```

Why this over alternatives:

- **vs MSW** — MSW is the "standard" at the network layer and has an RN story, but it adds
  a dependency + native/polyfill setup and duplicates the seam we already own. We keep MSW
  as a *possible later addition for tests* (network-level realism), not for app runtime.
- **vs per-feature mock functions** — scatters mock logic and makes the off-switch messy;
  rejected.

**What the mock must faithfully simulate** (so screens hit realistic behavior):

- Both envelope styles (§F6) and the exact object shapes from `API_REFERENCE` (User,
  FoodEntry, DailyLog, PlannedMeal, InsightCard, etc.).
- **Auth**: register/login issue `{access, refresh}`; protected routes require a valid
  bearer or return `401`; `/users/token/refresh/` mints a new access; logout blacklists.
  Access token "expires" (short mock TTL) so the refresh-on-401 path is exercised.
- **Async jobs**: meal-plan create returns `202 pending`, then `GET /meal-plans/{date}/`
  transitions `pending→generating→ready` over a few polls; same for `/import/{task_id}/`.
- **Quotas** (§16): `assistant`/`plan_generate`/etc. return structured `429` after N calls.
- **Error/empty states**: routes can be toggled to return `422`/`503`/empty so we can build
  25a–25c honestly.
- **Latency**: small artificial delay so loading states are real, not instant.

**Config:** add `EXPO_PUBLIC_API_MODE=mock|live` (mock default in dev) to `.env.example`
and read it in `app.config.ts` alongside `EXPO_PUBLIC_API_URL`. Live mode = today's
`fetch` path unchanged.

---

## 3. Mock-backed auth reconciliation (fold into Phase 1–2)

The scaffold currently diverges from the contract — reconcile it now, backed by the mock:

| Concern | Scaffold today | Target (per API_REFERENCE) |
|---|---|---|
| Login path | `POST /auth/login` | `POST /users/login/` |
| Register | (none) | `POST /users/register/` |
| Response | `{ token }` | Style A `data: { user, tokens: { access, refresh } }` |
| Token storage | single `authToken` in SecureStore | `access` **and** `refresh` in SecureStore |
| Expiry/refresh | none | `401 → POST /users/token/refresh/ → retry`; on refresh fail → sign out |
| Logout | delete token locally | `POST /users/logout/` (blacklist) + clear SecureStore |
| Envelope parsing | assumes bare | Style A unwrap for `/users/*` and `/core/*` |

Planned changes (no code in this doc):

- `shared/api/client.ts` / `queryClient.ts`: add 401→refresh→retry interceptor and a single
  `unwrap` seam for Style A vs Style B.
- `features/auth/api/authApi.ts`: `useRegisterMutation`, `useLoginMutation`,
  `useLogoutMutation`, `useRefresh` — against `/users/*`, parsing Style A.
- `features/auth/store/sessionStore.ts`: hold `access`+`refresh`, keep SecureStore the
  source of truth, expose `status` for the existing `Stack.Protected` gate.
- `features/auth/schemas.ts`: Zod schemas mirroring register/login payloads (email,
  password rules, optional profile fields, gender enum).
- Mock `features/auth/mocks`: user store + token issuance/blacklist.

Security guardrails (AGENTS.md §6, security-review skill): tokens only in SecureStore,
never logged, never in Zustand/AsyncStorage.

---

## 4. Phased build order (screens aligned to APIs + the USP)

Sequenced so each phase is demoable and later phases build on earlier seams. The USP
(unified cross-pillar home) is treated as non-negotiable and scheduled early after the
data it needs exists.

**Phase 0 — Foundations (shared).** Mock router + transport toggle (§2); finish the
`GlassCard` variants; build the design-system primitives the early screens need
(`WaveMark`/logo, `ProgressDots`, `SelectableChip`, `PrimaryIconButton`, `Screen`,
`useResponsive` already exists). Tokens already in `shared/theme/tokens.ts`.

**Phase 1 — Splash + First open (the experiment).** Custom animated splash → 20a/24a
First open. No API dependency → best fidelity test of design→code. **See §5.**

**Phase 2 — Auth + account creation.** 8a Save your core (register), login/return path
(F1), verify/password screens as needed. Mock-backed (§3). Unlocks the authed area.

**Phase 3 — Onboarding.** 7a·1–7a·8 core setup + 12a·1–12a·6 diet interview → `PUT
/users/me/diet-profile/`. Fitness (16a·*) / wellness (17a·*) captured mock-only (F2).
`onboarding_complete` gates entry to Home.

**Phase 4 — Home / dashboard (USP).** 24b petal-cluster home + 10a/10b composed/
calibrating, from `GET /daily-summary/` + `/core/config/`. Resolve the "back to Home from
inside a pillar" navigation detail (design-system §8: petal cluster is Home-only).

**Phase 5 — Nutrition.** 14a Diet home, 14b Log a meal (`POST /food/entries/` + search),
15a/15b/15c; meal plans (§12/§13) + meal assistant (§14). Photo/receipt (21a/21b) deferred
(F5/design-system §9).

**Phase 6 — Fitness & Wellness.** 16b/16c exercise (§9); 17b/17c wellness (water PATCH +
mock wellness logs, F3).

**Phase 7 — Assistant, insights, profile, states.** 18c presence/chat (meal assistant real
+ mock Q&A, F4); insights cards (§10, ≥30-day gate); 19a/19b profile (§4); 25a–25c
error/empty/offline states; 26a/26b paywall (UI only).

**Later (not MVP):** lock-screen/notifications (27a–c), real import/wearables (§11),
real billing, cross-pillar AI backend.

---

## 5. First experiment — Custom animated splash (feature-planning template)

### Feature: Splash (branded animated intro) → First open

**Job to be done:** On cold start, give the user a calm, on-brand moment (the wave drawing
itself) while the app boots and decides where to send them — proving the design system,
tokens, motion, and SVG logo all translate faithfully from the HTML export to React Native.

**Routes/screens:**
- Keep OS splash (`expo-splash-screen`, already wired in `src/app/_layout.tsx`) only to
  cover font/asset load, then hand off to an in-app animated splash.
- `src/app/(public)/splash.tsx` (new route group `(public)` for pre-auth, non-gated
  screens) → `src/features/splash/screens/SplashScreen`.
- On finish, route to: signed-in → `(app)`; signed-out & onboarding incomplete →
  `(public)/first-open`; signed-out & returning → login (F1).
- `src/app/(public)/first-open.tsx` → `features/onboarding` (or `auth`) First-open (20a/24a):
  sky gradient, wave logo, `coreo` wordmark, tagline "A health app with a core.", one glass
  CTA pill ("Begin"). Built immediately after the splash so the experiment has a landing.

**Design source (exact values, from design-system.md + screens-source.html):**
- Background: `linear-gradient(168deg, #D3E6F8 0%, #9EC3E8 48%, #6F9CCE 100%)` (sky ramp;
  map to `zenith/day/air/sky` tokens).
- Wave logo path: `M 16 60 C 32 36, 48 36, 60 60 S 92 84, 104 60`, viewBox `0 0 120 120`,
  `ink` stroke — render with `react-native-svg`.
- Wordmark: `coreo`, Poppins **38px / weight 300 / +6px tracking** (the `wordmark` type
  token — never reused at another size).
- Tagline: `body`/`caption` weight, `ink60`, sitting on a scrim/glass per contrast rule.

**Animation (design-system §5 motion + reduced-motion law):**
- Wave **draws in** via animated `strokeDashoffset` (Reanimated + SVG), ~900ms ease-out.
- Wordmark fades + slight letter-track settle after the wave completes (~300ms).
- Soft glow at the wave's "now" point (matches the signature wave treatment).
- **Minimum on-screen time** (~1.2s) so a fast boot doesn't flash the splash away.
- **`AccessibilityInfo.isReduceMotionEnabled` → static** logo + wordmark, no draw-in.

**Data & state:**
- Server data: none. (Optional: fire-and-forget `GET /core/health-check/` — public — to
  warm the client; not required.)
- Client/global state: `sessionStore.status` (`checking|signedOut|signedIn`, exists) +
  a **first-run / onboarding-complete flag**. Onboarding completeness is a *server* fact
  (`diet-profile.onboarding_complete`) → TanStack Query once authed; the pre-auth
  "has this user seen first-open" is small client state → tiny Zustand slice or a
  non-sensitive persisted flag (add `shared/lib/storage.ts` when needed, per architecture.md).
- Forms: none.

**Components:**
- New (feature-local first, promote to shared once reused): `AnimatedSplash`.
- New shared primitive: **`WaveMark`** (the SVG wave logo) + wordmark — reused by First
  open, headers, empty states, and the app icon. Add to design-system §7 inventory.
- Reused: `Screen` (safe-area), theme `tokens`, `useResponsive` (portrait-lock decision
  below).

**Edge cases to handle explicitly:**
- Reduced motion → static, no animation.
- Fonts not yet loaded → OS splash stays until `useFonts` resolves (already gated); animated
  splash only mounts after.
- Fast/slow boot → enforce min display time; never jank or double-flash.
- Routing correctness → splash must resolve to exactly one destination based on
  auth + onboarding state; no flicker of the wrong group (works with existing
  `Stack.Protected`).
- Orientation → splash and first-open are short single-decision moments: **lock portrait**
  is acceptable here (design-system §11.3 allows it for first-open), unlike Home/chat which
  must rotate.

**Out of scope for this pass:** analytics, A/B of intro variants, video/lottie assets,
localization of the tagline, the actual onboarding questions (Phase 3).

**Acceptance criteria:**
- [ ] Cold start shows the OS splash, then the animated wave draws itself in on the sky
      gradient with the `coreo` wordmark, matching design-system colors/typography (tokens,
      not hardcoded values).
- [ ] With "Reduce Motion" on, a static logo shows (no draw-in) and still transitions.
- [ ] Splash resolves to the correct next screen for each state (signed-in → app;
      new user → First open; returning signed-out → login).
- [ ] First open (20a/24a) renders with the glass CTA and navigates onward on tap.
- [ ] No flash-of-wrong-screen, no layout clip on a small phone (375pt) or in the
      min-display window; portrait-locked intentionally.
- [ ] `pr-review` checklist passed; no design values hardcoded in the component.

---

## 6. Documentation updates this plan requires (no code)

- **`docs/feature-map.md` (create)** — currently referenced by `product-context.md` but
  missing (F7); seed it from §1 here (feature list + phasing + MVP vs later).
- **`docs/design-system.md`** — add `WaveMark`/logo primitive and a **Splash** entry to §7
  inventory; add the splash draw-in to §5 motion.
- **`docs/architecture.md`** — §4 document the mock transport layer + `EXPO_PUBLIC_API_MODE`
  toggle; §5 add the `(public)` route group (splash/first-open) and note the onboarding gate;
  §3 note the first-run flag store + `shared/lib/storage.ts` when added.
- **`.env.example`** — add `EXPO_PUBLIC_API_MODE`.
- **`AGENTS.md`** — §2 repo map: point to the mock layer location once it exists.
- **`docs/product-context.md`** — record the "auth is mock-backed but built to the real
  contract" decision, and the F2/F3/F4/F5 backend gaps as open items.

---

## 7. Open decisions / assumptions to confirm

- **A1 (F1):** Is 8a "Save your core" the combined sign-in/register, or do we need a
  separate return-user login screen not in the design export? — assumed: small login screen,
  decide at Phase 2.
- **A2 (F2/F3/F4):** Fitness/wellness onboarding capture and wellness logging are
  **mock-only** until the backend adds fields/endpoints — assumed acceptable for MVP demo.
- **A3:** Petal cluster is the canonical Home nav (design-system §8, already decided); the
  "return to Home from inside a pillar" affordance is an implementation detail resolved at
  Phase 4, not a re-open.
- **A4:** Splash + First open lock portrait; all longer-lived screens support rotation
  (design-system §11.3).
- **A5:** Mock is the dev default (`EXPO_PUBLIC_API_MODE=mock`); live is a flag flip when the
  backend is ready.
```
