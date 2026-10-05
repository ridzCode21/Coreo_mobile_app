# Onboarding Refinement Plan — diet-profile questions + wave-progress screen

Status: **PROPOSED (plan only, no code).** Owner: Jarvis. Date: 2026-07-19.
Extends `docs/implementation-plan.md` (Phase 3 — Onboarding). Branch:
`feature/phase-0-1-foundations-splash`.

Three things this plan covers, all confirmed at kickoff:

1. **Visual refinement** — the existing onboarding option cards don't match the design
   (radius/height/sheen/typography) and the "connected" wave is decorative. Fix to match.
2. **Diet-profile question screens from the API** — build the screens that actually
   populate `PUT /users/me/diet-profile/` (§5 of `API_REFERENCE.md`), in the design-system
   style, in a **scalable/config-driven** way so questions can be changed later. Added
   screens for API fields the design didn't cover. `goal_type` mapped from the generic
   Goals screen.
3. **Wave-progress "calibrating" screen** — a **new** screen after the diet interview where
   the profile visibly "builds": a signature wave fills (solid past / dashed future /
   glowing "now" dot) to a completeness %, driven by the mock `GET /users/me/diet-profile/`
   so it maps 1:1 to the real API later.

---

## 0. Current state (what's on the branch)

Built: splash + First-open, and core-setup steps **7a·1–7a·7** (`name → goals → about-you →
pillars → sources → reading → promise`) + **8a save/register**, all mock-backed for auth.

Gaps this plan closes:

- **No diet-interview screens** (12a·1–12a·6) and **no diet-profile fields** in
  `onboardingStore` (it holds only `name/goals/ageYears/heightCm/weightKg/pillars/sources`).
- **No `diet-profile` mock** — only `features/auth/mocks/handlers.ts` is registered in
  `registerAllMocks.ts`; `GET/PUT /users/me/diet-profile/` are unhandled.
- **Cards don't match design**: `ToggleRow` is `radius.md` (20) / 56px tall with a plain
  2-stop gradient and no top sheen; design cards are ~68–72px, `radius.xl` (~28–30), larger
  text, visible inner highlight. `SelectableChip` unselected is a flat `rgba(255,255,255,.22)`
  fill (design chips read as glass).
- **`ReadingScreen` wave is decorative** (`OnboardingWaveStrip`, full-amplitude sine, no
  glowing now-dot, no area fill) and is tied to _source syncing_, not profile building.

---

## Part A — Visual refinement (match the design)

No new screens; tighten existing shared components against `design-system.md` §4 (material)
and §7 (inventory). All values come from tokens — nothing hardcoded (CLAUDE.md §6).

### A1. `ToggleRow` (full-width option card — Pillars, Sources, and all new single/multi cards)

| Aspect         | Now                   | Refine to (design)                                                                                                               |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Corner radius  | `radii.md` (20)       | `radii.xl` (~28–30)                                                                                                              |
| Height         | `minHeight` 56        | ~68–72                                                                                                                           |
| Fill           | 2-stop white gradient | keep gradient **+ add inner top sheen** (`inset 0 1px rgba(255,255,255,.65)` → a 1px top highlight overlay), per §4 material law |
| Title type     | `bodyLg` (14–15)      | ~`cardValue` (18–20, weight 300) to match design row text                                                                        |
| Selection mark | check circle only     | support **radio dot** (single-select) vs **check** (multi-select) via a `selectionMode` prop                                     |
| Blur           | none (flat gradient)  | optional `expo-blur` backing behind a capability check (§4 RN note); acceptable to keep gradient-only on Android                 |

Add a `selectionMode: 'radio' | 'check'` prop so the new single-select diet screens
(diet_type, cuisine, activity, budget) render a radio dot and multi-select
(allergies, health_conditions) render a check — both on the same card chassis.

### A2. `SelectableChip` (small multi-select chips — Goals, "Off the table")

- Unselected: replace flat `rgba(255,255,255,.22)` with a subtle light-glass gradient +
  the §4 sheen so chips read as glass, not flat rectangles. Selected state already correct
  (white fill + shadow + weight 500). Minor change.

### A3. `ReadingScreen` (7a·6) visual pass

- Swap `OnboardingWaveStrip` for the upgraded **`WaveChart`** primitive (see Part C) so the
  wave has the signature treatment (lower amplitude, area fill under the solid segment,
  glowing white "now" dot at the solid→dashed boundary) instead of a plain clipped sine.
- Keep the glass card + "58% synced / Sleep next" caption; this screen stays about
  _source sync_ (it's only reached when a source was connected). The **profile-building**
  progress is the separate new screen in Part C — same `WaveChart`, different data source.
- Footer: design shows a white "Keep going" pill (+ an assistant voice bar). **Flag V1** —
  confirm whether onboarding keeps the full-width dark `NextBar` (current, consistent with
  other steps) or adopts the design's white-pill + voice-bar footer here. Assumption: keep
  `NextBar` for flow consistency unless you want the exact design footer.

### A4. `OnboardingStepScaffold` — per-flow progress track

`ProgressDots` is currently hardwired to the 8-step core track. The diet interview is its
own track (the 12a screens show their own dots in the design). Parameterize the scaffold so
each flow passes its own `progressTotal`/`progressIndex` (core = 8, diet = number of diet
questions) rather than a single global constant. Small, keeps dots correct per flow.

---

## Part B — Diet-profile question screens (from `API_REFERENCE.md` §5)

### B1. Field → screen → enum mapping

Target contract: `PUT /users/me/diet-profile/` (Style B bare payload). `onboarding_complete`
becomes `true` once `goal_type` **and** `diet_type` **and** `cuisine_preference` are set.

| #   | Screen (design code)  | Question copy                                    | API field                      | Input                    | Values (API enum)                                                              | Origin                           |
| --- | --------------------- | ------------------------------------------------ | ------------------------------ | ------------------------ | ------------------------------------------------------------------------------ | -------------------------------- |
| D1  | 12a·1 Eating style    | "How do you eat?"                                | `diet_type`                    | single (radio card)      | vegetarian, vegan, non_veg, eggetarian, jain, keto, low_carb                   | design                           |
| D2  | 12a·2 Off the table   | "Anything your body refuses?"                    | `allergies` + `disliked_foods` | multi (chips + free add) | free list (peanuts, dairy, gluten…)                                            | design                           |
| D3  | **NEW** Cuisine       | "What flavours feel like home?"                  | `cuisine_preference` ⭑required | single (radio card)      | indian, south_indian, north_indian, mediterranean, any                         | added                            |
| D4  | 12a·3 Target          | "You're at {weight} kg. Where are we taking it?" | `target_weight_kg`             | slider (from `weightKg`) | kg                                                                             | design                           |
| D5  | **NEW** Activity      | "How much do you move on a normal week?"         | `activity_level`               | single (radio card)      | sedentary, light, moderate, active, very_active                                | added                            |
| D6  | 12a·4 Who cooks       | "Who makes your food most days?"                 | `cooking_frequency`            | single (radio card)      | every_meal, once_daily, batch_cooking, minimal_cooking                         | design (mapped, see F2)          |
| D7  | 12a·5 Meal rhythm     | "How does a normal day of eating flow?"          | `meal_frequency` (int)         | single → int             | 2, 3, 4                                                                        | design                           |
| D8  | **NEW** Budget        | "What's the food budget like?"                   | `budget_tier`                  | single (radio card)      | budget_friendly, moderate, premium                                             | added                            |
| D9  | **NEW** Health        | "Anything I should plan around?"                 | `health_conditions` (max 3)    | multi (check card)       | diabetes, pcos, thyroid, heart_health, high_bp, glp_1, none, prefer_not_to_say | added                            |
| D10 | 12a·6 Weak moment     | "When do you slip? I'll guard that hour."        | _(no API field)_               | single/multi             | skipping_meals, late_night_snacks, ordering_out                                | design (mock/assistant only, F3) |
| —   | 7a·2 Goals (existing) | mapped, not a new screen                         | `goal_type`                    | derived                  | lose_weight, maintain, gain_muscle, eat_healthier, manage_condition            | mapped (F4)                      |

Not asked (kept server-defaulted): `cooking_time_max` (default 30), `eating_pattern`
(default `mixed` — optional, can be added later via config, F5), `target_source` stays
`calculated`, and `daily_calories/protein/carbs/fat` are **auto-derived** by the backend/mock
(never asked).

Recommended order (matches confirmed "add screens" answer): D1 diet_type → D2 allergies →
D3 cuisine → D4 target → D5 activity → D6 who cooks → D7 meal rhythm → D8 budget →
D9 health → D10 weak moment → **calibrating (Part C)**.

### B2. `goal_type` mapping (from the generic Goals multi-select)

Keep the existing Goals screen (soft motivation, stored in the mock draft) and derive one
`goal_type` from it (confirmed: map, don't add a dedicated screen). Priority resolver:

1. "Lose weight" selected → `lose_weight`
2. else "Get stronger" → `gain_muscle`
3. else any `health_conditions` (from D9) present and not `none` → `manage_condition`
4. else "Eat cleaner" → `eat_healthier`
5. else → `maintain`

> **F4 (lossy mapping):** this heuristic is a deliberate stopgap. If goal accuracy matters
> for targets, revisit as a dedicated single-select `goal_type` question (the design just
> doesn't have one today). Flagged, not silently assumed.

### B3. Scalable, config-driven implementation

The user requirement is "scalable so it can be changed later." Make the diet interview
**declarative** rather than one bespoke screen per question:

- **`features/onboarding/lib/dietQuestions.ts`** — an ordered array of question specs:
  ```
  type DietQuestion = {
    id: string;                    // route segment + step id (e.g. 'diet-type')
    screenCode: string;            // design ref, e.g. '12a·1'
    field: keyof DietProfileDraft; // which API field it writes
    kind: 'single' | 'multi' | 'slider';
    title; titleEmphasis?; subtitle?;
    options?: { label: string; value: string }[];   // value = API enum
    slider?: { unit: string; from: 'weightKg'; min; max };
    required?: boolean;            // D3 cuisine, D1 diet_type
    maxSelections?: number;        // D9 health_conditions = 3
    toApi?: (v) => unknown;        // e.g. meal_frequency label→int
    apiField?: boolean;            // false for D10 weak-moment (mock-only)
  };
  ```
- **One generic `DietQuestionScreen`** reads the current spec by route param and renders
  `OnboardingStepScaffold` + the right input (reusing refined `ToggleRow`/`SelectableChip`/
  `SliderRow`) + `NextBar`. Adding/reordering/removing a question = editing the array; no new
  screen file. Routes are generated from the config (`(public)/onboarding/diet/[step].tsx`
  or one file per id that delegates to the generic screen — decide at build, both keep the
  logic in one place).
- This is the "changeable later" lever: swap copy, options, order, or drop a question by
  editing `dietQuestions.ts`.

### B4. State, schema, and query hooks

- **`onboardingStore`** gains a `dietProfile` draft sub-object mirroring the API fields
  (diet_type, allergies[], disliked_foods[], cuisine_preference, target_weight_kg,
  activity_level, cooking_frequency, meal_frequency, budget_tier, health_conditions[],
  plus mock-only `weak_moment`). Still Zustand client-draft state (architecture.md §3) —
  it becomes server data only when committed.
- **`features/onboarding/schemas.ts`** — a Zod `dietProfileSchema` mirroring the fields +
  enums (§17), reused to type the PUT payload (RHF only where there's real text input, e.g.
  the free-add allergy field; most steps are select-driven).
- **`features/onboarding/api/dietProfileApi.ts`** — TanStack Query (server data rule):
  `useDietProfileQuery()` (GET) and `useUpdateDietProfileMutation()` (PUT, invalidates the
  query). **Commit strategy:** PUT incrementally as each answer is confirmed, so the
  calibrating screen's completeness reflects real saved state (and a killed app resumes from
  the server draft). Query-key factory per feature.

---

## Part C — Wave-progress "calibrating your core" screen (new)

The centerpiece of this request: after the diet interview, a screen where the profile
visibly assembles as a wave.

**Placement:** new screen after D10, before 7a·8 Arrival / Home. Route
`(public)/onboarding/diet/calibrating` → `features/onboarding/screens/CalibratingScreen`.

**What drives the %:** `GET /users/me/diet-profile/` (mock now) → a pure
`dietProfileCompleteness(profile): number` (0–1) = answered tracked fields ÷ total. Because
answers were PUT incrementally (B4), the value is real. It maps 1:1 to the live API later —
only the transport flips (implementation-plan.md §2). The API's own `onboarding_complete`
boolean is also surfaced (the gate to Home).

**The visual — promote `OnboardingWaveStrip` → `WaveChart`** (the real signature primitive,
design-system.md §6.1), reused by Reading (A3) and here:

- Solid stroke = completed portion (past), dashed stroke = remaining (future), a **glowing
  white "now" dot** at the boundary, subtle area fill under the solid segment.
- Amplitude low/calm (matches the design's near-flat "synced" wave, not a big sine).
- **Animate** the now-dot + solid fill sweeping left→right to the completeness % on mount
  (Reanimated `withTiming` on `strokeDashoffset` + dot X), reduced-motion → static at final %.
- Caption reads e.g. "72% calibrated · budget next" (label token), voice per design-system
  §10 (calm, first-person, no exclamation).

**Copy/behaviour:** headline like "Building your core." → on 100% (or API
`onboarding_complete`) the CTA advances to Arrival/Home; if incomplete, CTA routes back to
the first unanswered question. Honest states per design-system §10 (never a scary/red error).

**Edge cases:** empty profile (0%) shows a calm "let's start" state, not a broken wave;
short/landscape viewport scrolls (design-system §11.3); reduced-motion static; slow mock
GET shows a loading shimmer on the card, not a blank.

---

## D. Sequencing & routing changes

- Diet interview runs **after** register (8a) — `diet-profile` PUT needs auth. `steps.ts`'s
  `SaveScreen` "decide where to go next" hook now routes into the diet flow (gated on the
  `diet` pillar being chosen at 7a·4 Pillars; if diet wasn't chosen, skip to Arrival/Home —
  reuse the existing skip pattern).
- New route group segment `(public)/onboarding/diet/*` (or keep under `(app)` since it's
  post-auth — **F6**, decide with the auth-gate: the diet interview is authenticated, so it
  arguably belongs in `(app)` onboarding, not `(public)`; confirm at build).
- Diet interview has its **own progress track** (Part A4), separate from the 7a core dots.

---

## E. Mock additions (so it "just works" now, swaps later)

- **`features/onboarding/mocks/dietProfile.handlers.ts`** — `GET` returns the stored profile
  (Style B, shape from §5); `PUT` merges the partial, recomputes `onboarding_complete`
  (goal_type && diet_type && cuisine_preference), and — unless `target_source: manual` —
  recomputes `daily_calories/protein/carbs/fat` from a simple Mifflin-St Jeor estimate
  (weight/height/age/gender/activity/goal) so targets look real in the UI.
- Seed per-user profile in `shared/api/mock/db.ts`; register the handler in
  `registerAllMocks.ts` (currently auth-only).
- Enforce list rules server-side in the mock too (`health_conditions` ≤ 3; allergies/
  disliked_foods are lists) so validation paths are exercised before the real backend exists.

---

## F. Flags & assumptions (confirm or correct)

- **F1 (Reading footer):** keep full-width `NextBar` vs the design's white-pill + voice-bar
  footer on 7a·6. Assumed: keep `NextBar` for consistency.
- **F2 (Who cooks ≠ enum):** design answers ("I cook / Family cooks / House help") don't map
  cleanly to `cooking_frequency` (every_meal/once_daily/batch_cooking/minimal_cooking).
  Plan maps loosely; better long-term is to align the copy to the enum. Flagged.
- **F3 (Weak moment):** no API field — captured mock-only for the assistant later; not sent
  in the diet-profile PUT.
- **F4 (goal_type):** lossy generic-goals→enum mapping (B2), per your "map" choice.
- **F5 (eating_pattern):** not asked; defaulted `mixed`. Add as a config entry later if
  wanted (the scalable config makes this a one-line addition).
- **F6 (route group):** diet interview is authenticated → likely `(app)` not `(public)`;
  confirm against the auth gate at build.
- **A (added screens):** cuisine/activity/budget/health screens are net-new designs in the
  existing style (no design-source mockup) — labelled as such in `design-system.md`.

---

## G. Documentation updates this plan requires (no code here)

- **`docs/feature-map.md`** — expand the onboarding row with the full diet-profile question
  list + the calibrating screen.
- **`docs/design-system.md`** — §7 inventory: add `WaveChart` (promoted from
  `OnboardingWaveStrip`), the `selectionMode` on `ToggleRow`, and the new "calibrating"
  screen; note the net-new question screens (cuisine/activity/budget/health) aren't in the
  original design source (§9-style flag).
- **`docs/architecture.md`** — note the config-driven diet-question registry pattern and the
  `dietProfileApi` query hooks; the `diet` route group decision (F6).
- **`docs/implementation-plan.md`** — mark Phase 3 detail as elaborated here; update F2/F3
  (fitness/wellness gaps still open, diet now specced).

---

## H. Acceptance criteria (user-observable)

- [ ] All diet-interview screens render in the design-system style with **cards matching the
      design** (radius, height, sheen, radio-vs-check), driven from `dietQuestions.ts`.
- [ ] Completing the interview writes a valid diet profile via mock `PUT
    /users/me/diet-profile/`; `onboarding_complete` flips true once diet_type + cuisine +
      goal_type are set.
- [ ] The **calibrating screen** shows a wave that fills (solid/dashed/glowing now-dot) to a
      completeness % read from mock `GET /users/me/diet-profile/`, animated (static under
      reduced-motion).
- [ ] Switching `EXPO_PUBLIC_API_MODE=live` later requires **no screen/hook changes** — only
      the transport flips.
- [ ] Questions can be added/reordered/edited by changing `dietQuestions.ts` only.
- [ ] Every screen scrolls (no clip) on a small phone and in landscape; `pr-review` passes;
      no hardcoded design values.
