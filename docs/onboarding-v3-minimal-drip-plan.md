# Onboarding v3 — Minimal-then-drip + Home/Nav restructuring plan

Status: **PROPOSED (plan only, no code yet).** Supersedes `onboarding-v2-flow-plan.md`'s
signup-last shape for *when* account creation happens and *where* the diet interview lives.
Written after reviewing the current codebase (`onboardingStore.ts`, `steps.ts`,
`dietProfileApi.ts`, `SaveScreen.tsx`, `resolveLaunchDestination.ts`, `architecture.md` §5,
`design-system.md` §8) against `API_REFERENCE.md` — every claim below is checked against what
those files actually do today, not assumed.

This single doc covers three coupled decisions, because none of them make sense in isolation:
(1) shrink pre-signup onboarding, (2) give `(app)` a real navigation shell for the first time,
(3) define what Home/Diet/Fitness/Wellness show on day one vs. once personalized.

---

## 0. Why now, and what changes

`product-context.md` §7 defines activation as "% of new signups who log in at least 2 of the 3
pillars within 48h" — not "% who finish the diet interview." The current flow (18 `FLOW_STEP_IDS`,
account created last) puts the longest, most cognitively loaded part of the app *before* the
metric that matters starts counting. `architecture.md` §5 already flagged this exact fork and
left it open: *"Revisit if a future path lets a signed-in user reach `(app)` without having
finished the local draft first (e.g. a future 'skip for now' escape hatch)."* This plan is that
revisit.

Two things make this tractable on the current backend, verified against the actual code, not
assumed:

- `PUT /users/me/diet-profile/` is a genuine partial update (`dietProfileApi.ts`'s
  `useUpdateDietProfileMutation` already sends a `DietProfilePatch`, and the mock's `PUT` handler
  in `dietProfile.handlers.ts` merges `{...current, ...patch}` and recomputes
  `daily_calories`/`daily_protein_g`/etc. from whatever's present). Nothing needs the whole
  interview committed in one shot — that was a v2 design choice (single-commit-at-the-end), not a
  backend constraint.
- The mock's `DEFAULT_DIET_PROFILE` already ships sane generic numbers (`daily_calories: 2000`,
  etc.) for a profile nobody has touched yet. A freshly-registered account is never "no data" —
  it's "generic, honestly-labeled data" until personalized. Home/Diet don't need an empty state
  for targets; they need an honest "these are starter numbers" state.

One correction to make up front, to a claim in the plan you pasted: the concern *"stop using
`onboarding_complete` as a route guard"* doesn't apply to code that exists today —
`resolveLaunchDestination.ts` never reads `diet-profile.onboarding_complete`; it only checks
`isSignedIn` and the local `hasOnboardingProgress` flag. There's no gate to remove. But the
*principle* still matters going forward, because this plan is exactly the "signed-in user reaching
`(app)` with an incomplete profile" case `architecture.md` flagged as unbuilt — so we do need to
make sure whatever `(app)` guard we add next doesn't reintroduce that pattern by accident.

---

## 1. New top-level flow

```
APP OPEN
  │
  ├─ signed in ────────────────────────────────────────────────► (app) tabs, straight to Coreo/Home
  │
  ├─ signed out, draft in progress ──► resume at firstUnansweredFlowStep (unchanged mechanism)
  │
  └─ signed out, nothing in progress
        ↓
     first-open ("Begin")
        ↓
     name → goal → about-you (age/height/weight) → gender → pillars
        ↓
     save (register)
        │  POST /users/register/
        │  PUT  /users/me/diet-profile/  { goal_type, weight_kg, height_cm }
        ↓
     (app) tabs → Coreo/Home  ◄── default tab after signup
        │
        ├─ Diet     → first-visit nudge: "3 quick things" (diet_type, activity_level, allergies)
        ├─ Fitness  → Phase 6, unchanged for now
        ├─ Wellness → Phase 6, unchanged for now
        └─ Coreo    → cross-pillar snapshot (this doc §5)
```

Six pre-signup screens instead of eighteen. All six already exist as built components — this is a
`steps.ts` re-sequencing plus deleting entries from `FLOW_STEP_IDS`, not new screens. `promise` and
`calibrating` are dropped from the pre-signup path (§2 explains where their ideas go instead).

---

## 2. What moves out of pre-signup, and where it goes

| Current `FLOW_STEP_IDS` entry | New home | Why |
| --- | --- | --- |
| `target` (target weight) | Diet tab, tier 1, conditionally (same `isFlowStepVisible` rule) | goal-specific, cheap, but not needed to create the account |
| `activity` | Diet tab, tier 1 | materially changes the calorie estimate — highest-value single question to ask early, just not pre-signup |
| `diet-type` | Diet tab, tier 1 | needed for any real personalization and for `onboarding_complete` |
| `cuisine` | Diet tab, tier 2 — **special-cased**, see §6 | affects meal-plan quality but the API also folds it into `onboarding_complete`, so it needs care |
| `off-the-table` (allergies) | Diet tab, tier 1 | safety-adjacent (what not to suggest) — worth front-loading even though it's "tier 1 optional" in spirit |
| `who-cooks`, `meal-rhythm`, `budget` | Diet tab, tier 2 ("Sharpen your plan") | improves meal plans, doesn't block logging or basic targets |
| `health` | Diet tab, tier 2 | sensitive; deserves its own unhurried moment, not squeezed into a signup funnel |
| `weak-moment` | Diet tab, tier 2 (or cut — see open decisions) | mock-only already, no API field |
| `promise` | Retired as a screen. Its "here's what you get" beat happens implicitly now — the user sees the real Home right after signup instead of a screen promising one. | signup-last no longer needs a pre-reveal hype screen once the reveal *is* signup |
| `calibrating` (profile-completeness wave) | Re-platformed as a persistent **"Sharpen your plan"** progress meter inside Diet/Profile (§6), not a one-time pre-signup screen | `design-system.md` §7 already documents `WaveChart` as used for "diet-profile completeness" — this reuses the exact same component for an ongoing indicator instead of a single moment, no new visual design needed |

---

## 3. Signup orchestration (concrete change to `SaveScreen.tsx`)

Today `buildDietProfilePatch(draft)` sends the *entire* draft (all diet-interview fields) in one
`PUT` right after register. Under this plan, at the point `save` is reached, the draft only has
`goal_type`, `weightKg`, `heightCm`, `gender`/`ageYears` (for the register call itself) — the diet
interview fields (`diet_type`, `cuisine_preference`, etc.) simply haven't been asked yet, so
they're `null` in the draft and the patch naturally becomes:

```ts
{ goal_type: draft.dietProfile.goal_type ?? resolveGoalType(...), weight_kg, height_cm }
```

No branching logic needed in `SaveScreen.tsx` beyond removing the now-unreachable diet-interview
fields from the draft — the same `useUpdateDietProfileMutation` call, same
`registerMutation → signIn → PUT diet-profile → router.replace('/(app)')` sequence already there.
`onboarding_complete` will correctly read `false` after this (goal_type set, `diet_type`/
`cuisine_preference` still null) — that's expected and fine, since nothing gates on it.

---

## 4. Profile-completion model (replaces any future `onboarding_complete`-as-gate temptation)

Per `architecture.md` §5's own framing (client-side pre-auth facts vs. server-side profile facts),
add one small **derived, client-side selector** — not a new store, just a pure function over
`DietProfile` — used to decide what nudges to show, never to block navigation:

```ts
// features/onboarding/lib/profileCompletion.ts (new, pure — same pattern as steps.ts)
type ProfileCompletion = {
  core: boolean;       // goal_type, weight_kg, height_cm all set (true right after signup)
  dietQuick: boolean;  // diet_type, activity_level set (allergies is a list — see §7 caveat)
  mealPlanReady: boolean; // dietQuick && cuisine_preference set
  sharpened: boolean; // cooking_frequency, meal_frequency, budget_tier, health_conditions all answered
};
```

`(app)` never redirects on any of these — they only drive which nudge cards render on Home/Diet.
This directly answers the concern in the plan you pasted, just implemented as a selector instead of
a new boolean, since the shape of "done" here is genuinely multi-dimensional (diet vs. meal-plan vs.
"nice to have"), not a single flag.

---

## 5. Navigation restructuring — `(app)` becomes a real tab shell

Today `(app)/_layout.tsx` is a bare `Stack` with one stub `index.tsx` re-exporting
`DietHomeScreen` (explicitly commented as temporary, "until the petal-cluster Home (Phase 4) is
built"). This plan **is** that Phase 4 trigger, so it's the right moment to build the shell too —
otherwise Diet/Fitness/Wellness/Coreo would each need their own ad-hoc "how do I get to another
pillar" affordance, which is exactly the gap `design-system.md` §8 left open.

**Resolving that open gap, not reopening the decision:** §8 says petal cluster is canonical for
*the Home centerpiece*, and separately documents Glass Dock (23A, the `BottomDock` component
already specced in §7 — 72px night-glass bar, 4 icon+label columns) as reference material for
*"a persistent way to reach a pillar from inside another pillar's screens, which the petal cluster
alone doesn't solve since it's a Home-only centerpiece."* That's precisely this problem. Proposal:

- **`BottomDock` becomes the persistent chrome** — 4 items: Diet / Fitness / Wellness / Coreo.
  Build it once in `shared/components/BottomDock.tsx` (it's already fully specced, just not built)
  and wire it as `(app)`'s tab bar (Expo Router `Tabs`, custom `tabBar` render using `BottomDock`
  rather than the default RN tab bar, matching how `Screen`/`GlassCard` already wrap RN primitives
  elsewhere in this codebase).
- **`PetalCluster` stops being the only way to navigate and becomes the Coreo tab's hero
  widget** — still built exactly per §6.3's spec (2×2 grid, swept corners, halo), still tappable
  (tapping a petal deep-links to that tab, a nice-to-have shortcut), but no longer load-bearing for
  navigation. This is a genuine upgrade, not a downgrade: a static nav grid duplicates the tab bar;
  a *live* petal cluster (see §6 below) gives you information the tab bar can't.
- Route restructure: `app/(app)/_layout.tsx` becomes a `Tabs` layout with
  `app/(app)/(tabs)/diet/`, `.../fitness/`, `.../wellness/`, `.../coreo/` (or `home/` — naming call,
  see Open decisions), each an independent stack so pushed screens (meal confirm, barcode scan,
  meal recipe) still work per-tab without leaking into other tabs' history. `nutrition/confirm` and
  `nutrition/scan` move under `(tabs)/diet/` accordingly.

---

## 6. Coreo/Home tab

### 6.1 Data orchestration

On tab focus (existing signed-in user, the common case):

```
parallel:
  GET /users/me/diet-profile/   (already have useDietProfileQuery — reuse as-is)
  GET /daily-summary/?date=today
  GET /meal-plans/{today}/      — only if one is known to exist; see §7's "don't auto-generate"
```

No `GET /users/profile/` needed on every load — `register`/`login` already return `<User>`, and
`sessionStore`/an auth-scoped user cache can hold it (matches the pasted plan's point 9, and avoids
an extra round trip on every Home mount).

### 6.2 What it shows — honest data only

The screenshot-style "90 score" / intraday trend curve / "Push · 6PM" / "Dinner before 7:30" ideas
in the plan you pasted are good *taste*, but per that same doc's own audit, none of those have a
backing endpoint (no time-series API, no exercise-scheduling API, no meal-time field on
`PlannedMeal`). Per `product-context.md` §6 ("no feature should imply clinical-grade accuracy," and
generally: don't fabricate authority the backend doesn't have), Home should show:

- Today's calories/macros vs. target (from `daily_log` + `diet-profile`'s `daily_*` fields) —
  using the existing dot-matrix numeral / wave-chart signature elements, not a fake single score.
- Water, steps, sleep, HRV, workout count — straight from `daily_log`, only rendered if non-null
  (steps/sleep/HRV are wearable-import-only per `daily_summary`'s payload — if nothing has been
  imported, show them as "not tracked yet" rather than 0, since 0 sleep hours reads as a health
  alarm, not an empty state).
- Next planned meal — only if a plan for today actually exists (`GET /meal-plans/{date}/` 404 is
  the common case for most users most days; don't show a "Next: Lunch" card built on a plan that
  hasn't been generated).

### 6.3 A real cross-pillar differentiator, without inventing an API

Since you asked for something unique here specifically: rather than a fabricated "Core Index," compute
a transparent, explainable composite **client-side**, from data that's already real — e.g. "3 of 4
things on track today" (calories within range, water ≥ target, one workout logged, no missed meal) —
each contributing factor visible and tappable back to its source. This uses the dot-matrix numeral
component for the count (not a mysterious 0–100 score), keeps the medical-safety posture honest (§6
of `product-context.md`), and is the actual cross-pillar reasoning the product's USP promises —
because it's the one number on the whole screen that *requires* diet + fitness + wellness data
together to compute. That's a stronger "unique" story than a nicer-looking static score would be,
and it costs zero new backend work.

### 6.4 First-run state (new account, nothing logged yet)

Not empty — generic-but-real targets already exist (§0). Home shows:

- A one-line welcome + the stated goal ("Gain muscle — we'll tune this as we learn more").
- The starter macro ring (2000/150/200/60 defaults or whatever the account's actual `daily_*`
  values are — always real numbers, labeled as starting estimates via a small "estimated" tag, not
  hidden).
- One nudge card: "Personalize your Diet — 3 quick things, less than a minute" → tier-1 Diet setup
  (§7), only shown while `dietQuick` is false.
- Two quick-action pills: "+ Log meal", "+ Add workout" — both work immediately, zero profile
  dependency, because `POST /food/entries/` and `POST /exercise/entries/` don't require a diet
  profile at all (verified against `API_REFERENCE.md` §8/§9 — this is the one part of the plan you
  pasted that's unambiguously correct and important: logging must never be gated behind
  personalization).

---

## 7. Diet tab — tiered personalization

### 7.1 First visit after signup

`GET /users/me/diet-profile/` → if `dietQuick` (§4) is false, show a compact 3-question flow
before the normal Diet home (reusing existing `ToggleRow`/`SelectableChip` components, same visual
language as the current diet-interview screens — no new component work):

1. "How do you usually eat?" → `diet_type`
2. "How active are you?" → `activity_level`
3. "Anything we should avoid?" → `allergies` (chip grid, "No allergies" as an explicit option — see
   §7.3 on why that specific chip matters)

On submit: one `PUT /users/me/diet-profile/` with just those three fields (partial patch, already
supported). Then render normal Diet home — `targetsFromProfile` recalculates immediately since the
mock's `PUT` handler reruns `estimateDailyTargets` whenever `weight_kg`/`height_cm` are present,
which they already are from signup.

If the user backs out of this without answering, don't force it again on every visit — show it as
a dismissible card at the top of Diet home instead (same "nudge, don't gate" principle as Home).

### 7.2 "Sharpen your plan" — tier 2, ongoing

A checklist (reachable from Diet home and/or Profile), reusing `WaveChart` for the completeness
indicator exactly as `calibrating` used it, just persistent instead of one-shot:

```
SHARPEN YOUR PLAN            ●●●○○○○○  (3/8, matches ProgressDots visual language)
✓ Goal            ✓ Body details       ✓ Diet type
○ Cuisine         ○ Cooking preferences ○ Budget
○ Foods you dislike            ○ Health considerations
```

Each row opens one small edit sheet, calls `PUT /users/me/diet-profile/` with that field alone. No
blocking, no wizard — this directly is the "Sharpen your plan" idea from the plan you pasted, and
it's cheap to build since it's N tiny single-field forms around one existing mutation hook.

### 7.3 Cuisine — special-cased (new flag, call it F12 for `feature-map.md`)

`cuisine_preference` is both (a) part of the API's own `onboarding_complete` definition and (b) the
single field that most affects meal-plan quality. Two options, not mutually exclusive:

- **Now, no backend change:** ask it contextually the first time the user taps "Generate today's
  plan" if it's still unset — one question, then immediately `POST /meal-plans/`. This is what the
  plan you pasted proposed and it's the right no-backend-change default.
- **Flag for backend, longer-term:** ask whoever owns the API whether `onboarding_complete` can
  become non-blocking metadata (e.g. `profile_completion: { core, diet, meal_plan_ready, ... }`
  instead of one boolean gated on three specific fields) — this doesn't block shipping the tiered
  UI, it's a request to file alongside the existing F2/F3 gaps, not a prerequisite.

### 7.4 Don't auto-generate meal plans

`plan_generate` is quota-limited (2/day free tier, `API_REFERENCE.md` §16). Diet home must never
call `POST /meal-plans/` on mount or on first `dietQuick` completion — always an explicit
"Generate today's plan" tap, so a user who opens the tab twice doesn't silently burn their daily
quota. If a plan already exists for today, show it; if not, show the CTA, never auto-fire it.

### 7.5 The `[]`-ambiguity — narrower than it first looks

One correction to the plan you pasted: `health_conditions`'s enum already includes `'none'` and
`'prefer_not_to_say'` (`shared/types/dietProfile.ts`) — so health conditions *can* distinguish
"answered: none" from "never asked," as long as the UI always offers an explicit "None of these"
chip (it already should, per the existing `dietQuestions.ts` config). The real gap is narrower:
`allergies` and `disliked_foods` are bare `string[]` with no sentinel value, so `[]` is genuinely
ambiguous for those two only. Cheapest fix that ships today, no backend change: track "has this
section been visited" as a small local flag (AsyncStorage, alongside the existing onboarding
persistence pattern) rather than inferring it from the array's contents. File the "real" fix
(`completed_profile_sections` or similar, as the pasted plan suggested) as a backend request, same
as F12 above — not blocking.

---

## 8. Fitness & Wellness tabs

Out of scope to redesign here (still Phase 6, unchanged data model), but now that they're real tabs
instead of future placeholders, two small consistency notes for whoever builds them:

- Fitness: remember `GET /exercise/exercises/` requires `?mine=true` or it silently returns `[]`
  (documented in `API_REFERENCE.md` §9, easy to miss).
- Wellness: only `water_ml` has a write endpoint (`PATCH /daily-summary/water/`). Sleep/HRV/steps
  are read-only (wearable-import shaped, §10), so Wellness's manual-entry UI for those (per F3 in
  `feature-map.md`) stays mock-only until backend support exists — same flag, not a new one.

---

## 9. How this reshuffles the existing phase numbering

`implementation-plan.md` §4's phases assumed signup-last onboarding, then Home, then Nutrition, in
that order. This plan interleaves them:

- **Phase 3 (Onboarding)** shrinks to the 6-screen minimal flow (§1/§2) — smaller scope than before.
- **Phase 4 (Home)** now ships *with* the tab shell (§5) as a prerequisite, not after — Home can't
  be "the Home tab" without tabs existing first. Recommend building §5 (shell) and §6 (Home
  content) as one slice.
- **Phase 5 (Nutrition)**'s already-built Layer 1 (Diet home, logging) stays as-is; this plan adds
  the tier-1/tier-2 personalization screens (§7) as new Layer-1.5 work, and formalizes "don't
  auto-generate plans" (§7.4) as a hard rule for Layer 2 when meal plans get built.
- Fitness/Wellness (Phase 6) are unaffected in scope, just now live inside the tab shell from day
  one instead of being bolted on later.

---

## 10. Open decisions (need your call before this gets built)

1. **Tab labels/order** — "Coreo" vs. "Home" as the 4th tab's label, and whether it's the
   leftmost or rightmost position (the pasted plan's screenshot had it rightmost; `design-system.md`
   §6.3 describes the petal cluster's "Core" cell as visually brighter than the pillar cells, which
   might argue for a center or first position instead).
2. **`weak-moment` (D10)** — cut entirely (it's mock-only, no API field, and was already the
   lowest-value question) or keep it in tier 2? Leaning cut, but it's your product call.
3. **DOB vs. age slider** — unchanged from today's approximation (`ageToApproxDob`) unless you want
   to revisit collecting a real DOB at signup now that signup is earlier in the funnel anyway.
4. **Filing the two backend requests** (F12 cuisine/`onboarding_complete` rework,
   `completed_profile_sections` metadata) — do you want these written up as formal asks now, or
   held until closer to when a real backend team picks this up?
5. **Analytics gap** (raised last turn, still open) — this plan makes funnel measurement *more*
   important, not less, since "did the tier-1 nudge get answered" is now a real product question
   with no telemetry endpoint to answer it. Worth deciding whether to stub client-side event
   logging now (even just console/log-to-file in mock mode) so the instrumentation habit starts
   with this rebuild rather than after.

---

## 11. Suggested build order (once the above is settled)

1. `steps.ts`/`FLOW_STEP_IDS` shrink + `SaveScreen.tsx` patch simplification (§2/§3) — small,
   mechanical, low-risk, fully reuses existing screens.
2. `BottomDock` component (§5) — already fully specified in `design-system.md` §7, just unbuilt.
3. `(app)` → `Tabs` shell restructuring, moving `nutrition/*` under `(tabs)/diet/` (§5).
4. Coreo/Home tab (§6) — data orchestration + first-run state before the "live petal cluster"
   polish, so there's a working Home fast, refined after.
5. Diet tier-1 nudge + tier-2 checklist (§7) — reuses `useUpdateDietProfileMutation` as-is.
6. Update `feature-map.md` with F12/F13 and the new phase shape (§9) once built, per that file's
   own "update this file, not just the plan doc" instruction.
