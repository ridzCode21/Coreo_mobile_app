# Onboarding v3 — Minimal-then-drip + Home/Nav restructuring plan (rev. 2)

Status: **PROPOSED (plan only for the unbuilt parts — Home/Diet IA needs rework before more gets
built on top of it).** Rev. 2 folds in a review of the actual implemented Home/Diet screens (four
screenshots reviewed against `API_REFERENCE.md`) — several things shipped ahead of this doc drifted
from the intent in rev. 1, and this revision corrects course before the meal-planner phase (Layer 2)
adds more weight on top. Sections 0–4 (pre-signup flow, signup orchestration, profile-completion
model) are unchanged from rev. 1 and still stand. Sections 5–9 are substantially rewritten.

---

## 0. Why now, and what changes (unchanged from rev. 1)

`product-context.md` §7 defines activation as "% of new signups who log in at least 2 of the 3
pillars within 48h." The pre-signup interview should be short, and personalization should happen
progressively after signup — this part of the plan is confirmed correct by the build so far (the
visual language holds up, minimal-then-drip is the right direction). What needs correcting is what
happens *after* signup: Home and Diet have started duplicating each other, and the progressive
personalization checklist has quietly grown back into a full onboarding form, just relocated inside
the app instead of before it.

---

## 1. New top-level flow (unchanged from rev. 1)

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
```

Six pre-signup screens instead of eighteen (§2 of rev. 1 has the full FLOW_STEP_IDS mapping —
unchanged).

---

## 2–4. Screen relocation, signup orchestration, profile-completion model (unchanged from rev. 1)

No changes. `steps.ts` shrinks the same way; `SaveScreen.tsx` sends the same minimal patch;
`ProfileCompletion` stays a pure derived selector, never a navigation gate. One addition to §4's
selector, needed by §6/§7 below:

```ts
// features/onboarding/lib/profileCompletion.ts — add alongside the existing booleans
type TargetQuality = 'unavailable' | 'starter' | 'estimated' | 'confirmed';

function targetQuality(profile: DietProfile): TargetQuality {
  if (profile.weight_kg == null || profile.height_cm == null) return 'unavailable';
  if (!profile.diet_type || !profile.activity_level) return 'starter';
  if (!profile.cuisine_preference) return 'estimated';
  return 'confirmed';
}
```

This is a **frontend-derived label**, same caution as `ProfileCompletion` itself: the API exposes
`target_source: calculated | manual` but nothing resembling "estimate quality" — don't imply the
backend computed a confidence tier it didn't. This function is the single place that decision lives,
so Home's headline, the targets card's badge, and the personalize-card copy all read the same tier
instead of three screens independently guessing.

---

## 5. Navigation — corrected

Rev. 1's `BottomDock`-as-tab-bar / petal-cluster-as-widget resolution stands. Two corrections found
during implementation review:

- **No back button on a tab root.** The Diet screen currently shows a back affordance, which is
  wrong once Diet is a tab rather than a pushed stack screen — there's nothing to go "back" to from
  a tab, and it visually implies Diet is a step in a sequence rather than a peer of Home/Fitness/
  Wellness. Back buttons belong only on screens **pushed from within** a tab's own stack — meal
  confirm, barcode scan, a meal's recipe/detail, a single-field personalization sheet opened from
  the "Sharpen your plan" checklist (§7.2). Each tab's root (`(tabs)/diet/index.tsx`, etc.) must
  render with no header-back affordance; only screens nested one level deeper under that tab get one.
  This is a one-line fix per tab root (`headerShown: false` / omit the back button on the root
  `Stack.Screen`, consistent with how `(app)/_layout.tsx` already sets `headerShown: false` at the
  group level today) but worth calling out explicitly since it's easy to reintroduce by copying a
  screen that used to be a pushed step.
- **Tab roots never navigate to each other via push.** "Tap Nutrition → Diet" style cross-links from
  Home (§6) must switch tabs (`router.navigate` to the tab route), not push Diet onto Home's stack —
  otherwise you'd get exactly the "back button on a tab" problem again one level removed.

---

## 6. Coreo/Home — corrected hierarchy

### 6.1 What's wrong with the current build

- **The "On Track Today" X/4 count implies more than the backend knows.** Calories has a real
  target to compare against; water, workout, and "meal logged" don't — there's no water target
  field, no way to know if a rest day was intentional, and "logged a meal" isn't really an
  on/off-track judgment. Labeling it "transparent count, not a mystery score" doesn't fix this: a
  user who deliberately rests today will read "0/4, off track" as the app being wrong about them.
  This is a case of the UI asserting a conclusion (*"on track"*) the API can't actually support yet
  — same category of problem `product-context.md` §6 warns about for the AI assistant (don't imply
  authority you don't have), just showing up in a stat card instead of assistant copy.
- **The macro/target card is fully duplicated between Home ("Starter Targets") and Diet ("Left
  Today")** — same numbers, same layout, twice. This will only get worse once meal plans, "next
  meal," and remaining-calories-after-a-planned-meal all need to live somewhere — both screens will
  keep competing to be the nutrition dashboard unless their jobs are split now.
- **`0 / 0 kcal` (and the all-"Not tracked yet" Signals grid) reads as broken**, not as an honest
  empty state. A fresh account should never show a bare zero-over-zero.
- **The headline is state-blind.** "Today, your core is readable" next to four zeros and four
  "Not tracked yet"s contradicts itself.

### 6.2 The fix — Home answers exactly two questions

*How is my day going overall, and what's one thing worth my attention?* Nothing else earns a
permanent card.

```
{state-aware headline — see 6.4}

TODAY
─────────────────────────
Nutrition        0 / 2,023 kcal        (tap → Diet tab)
Movement         Not logged yet        (tap → Fitness tab)
Hydration        0 ml                  (tap → Wellness tab, or inline +Add water)

{ the one contextual card — §6.3 }

+ Log meal              + Add workout
```

No `/4` score, no macro-by-macro breakdown (that's Diet's job, §7), no four-way "Not tracked yet"
grid as a standing fixture. This is a straight edit of the existing `MacroSummaryCard`-style
component: replace the ring+full-breakdown with a three-row facts list, each row backed directly by
`daily_log.calories_in`/`workout_sessions`/`water_ml` — no interpretation layer.

### 6.3 The one contextual card — pick the single most useful thing, not five

Priority order (first match wins, only one shown at a time):

1. **Tier-1 diet setup missing** (`!dietQuick`, §7.1) → "Personalize your diet" card (§7's copy).
2. **A meal plan exists and has an unlogged upcoming meal today** (once Layer 2 ships) → "Next:
   {meal name} · {time-of-day label}" card, tap → Diet.
3. **≥30 days logged and a fresh insight exists** (`GET /insights/`) → "Coreo noticed…" card. This
   is explicitly the best long-term version of this slot — real correlation data, not an invented
   score — but it's gated on data that won't exist for a month after launch, so it's priority 3, not
   1, and Home must degrade gracefully to priorities 1/2 until then.
4. **Nothing pending** → no card at all. An empty slot is fine; a padded, low-value card isn't.

This directly replaces the always-on Signals/Personalize/On-Track stack with exactly one card,
chosen by what's actually useful right now — which is also a more literal reading of the product's
own cross-pillar promise than five parallel status cards ever was.

### 6.4 Signals card — conditional, not four empty states

Keep the concept (it's well-grounded in `daily_log`'s `water_ml`/`steps`/`sleep_hours`/`hrv`), fix
the presentation and the write-affordance mismatch:

- If **any** of the four have real values: show them as a compact row (`1.4 L`, `7,820`, `7h 20m`,
  `48 ms`), omitting fields still null rather than padding with "Not tracked yet."
- If **none** have values: one compact card, not four — "No health signals yet. Add water or import
  health data." with two actions: `[+ Add water]` (the one field with a real write endpoint,
  `PATCH /daily-summary/water/`) and `[Import data]` (routes to the Sources/import flow, wherever
  that ends up living post-onboarding). Steps/sleep/HRV get no manual-entry affordance anywhere in
  this card — they're wearable-import-only per the API, and offering to "enter" them implies a write
  path that doesn't exist.
- On a brand-new account specifically, it's fine to omit this card from Home entirely for the first
  session and let the Wellness tab own it — Home's job is the 30-second glance, not every metric.

### 6.5 State-aware headline

Four literal states, driven by the same facts already computed for §6.2/6.3 — no new data source:

| State | Trigger | Headline |
| --- | --- | --- |
| Fresh | no entries logged today, no insights | "Today starts here." |
| Active, no insight yet | ≥1 entry logged today | "Here's where today stands." |
| Established | `targetQuality` ≥ `estimated` and some logging history | "Today, your core is readable." |
| Insight available | §6.3 priority 3 card is showing | "A pattern is starting to show." |

---

## 7. Diet tab — corrected

### 7.1 First visit after signup (unchanged from rev. 1, copy tightened)

Same 3-question tier-1 flow (`diet_type`, `activity_level`, `allergies`), same single `PUT`. Tighten
the nudge copy to name the fields and the payoff, since "3 quick things are waiting" doesn't tell
the user what happens if they tap it:

> **Personalize your diet**
> 3 quick things to improve your targets and future meal plans.
> Diet type · Activity · Foods to avoid
> `[ Finish in ~1 min → ]`

Use this **one** wording in the **one** place it appears (Diet tab only — remove the duplicate
Home-level nudge per §6.3's "one contextual card" rule).

### 7.2 "Sharpen your plan" moves one level deeper — it's the biggest structural fix in this revision

The flat 10-item checklist recreates the exact pressure the minimal-then-drip rework was meant to
remove — "4/10, 40%" tells a user they have six forms left, just relabeled as optional. Two concrete
problems with the current version, beyond the psychology:

- **The 40% is a fabricated equal-weighting.** `diet_type`/`activity_level` change targets
  materially; `budget_tier`/`cooking_frequency` are flavor. Treating all ten as one-point-each
  implies a precision the product doesn't have an opinion on.
- **At least one item can show a false ✓.** `meal_frequency` defaults to `4` server-side and is
  never null (`API_REFERENCE.md` §5) — if "answered" is computed as "field is non-null," Meal rhythm
  will read complete for every user, including one who's never touched it. This needs the same
  explicit "answered" tracking already flagged in rev. 1 §7.5 for `allergies`/`disliked_foods`
  (empty-array ambiguity) — extend that local flag to cover every field that ships with a non-null
  server default, not just the empty-array fields.

**Fix — replace the standing checklist with contextual, trigger-based asks**, and move the full
editable list to Profile/Personalization (one level deeper, reachable but not a Diet-home fixture):

| Trigger | Ask | Why this moment |
| --- | --- | --- |
| First Diet visit, `!dietQuick` | diet_type, activity_level, allergies | §7.1 — already the plan |
| First tap on "Generate today's plan," cuisine unset | cuisine_preference (+ any other still-missing field that blocks generation) | User just asked for food — the API also folds cuisine into `onboarding_complete`, so this is the natural moment, not signup |
| Tap "Replace meal" | disliked_foods (if unset) | Directly relevant to the action just taken |
| Regeneration reason = `too_expensive` | budget_tier | The complaint *is* the missing field |
| Regeneration reason = `too_much_cooking` | cooking_frequency / cooking-time preference | Same pattern |
| `goal_type == 'manage_condition'` at signup | Prioritize `health_conditions` at the *next* Diet visit, ahead of diet_type/activity in tier-1 ordering | The stated goal makes this field unusually relevant sooner |

A user experiences this as "Coreo asked one thing because I just asked it to do something," not
"my profile is 40% done." This is also a better fit for the meal-plan API specifically —
`RegenerationReason` already includes `too_expensive`/`too_much_cooking`/`dont_like_foods`/
`different_cuisine`, which map almost one-to-one onto the profile fields above. The regeneration
flow effectively *is* a contextual-profiling trigger the backend already half-designed for.

Keep one compact, honest indicator instead of the 40%-style card — e.g. a small "2 useful details
still missing" line inside a lower-priority "Improve recommendations" row (§7.3), not a hero card,
and drop the equal-weighted percentage entirely.

### 7.3 Diet tab layout, once meal plans (Layer 2) exist

```
DIET
─────────────────────────
TODAY'S NUTRITION                                    (moved here from Home, full detail)
1,240 / 2,023 kcal  [Estimated]
Protein  82/112g   Carbs 130/268g   Fat 41/56g

TODAY'S PLAN                                          (new, Layer 2 — the primary object)
Breakfast · Masala oats · 350 kcal
Lunch · Chicken rice bowl · 520 kcal
Dinner · …
[See full plan]

QUICK ADD
Search · Photo · Barcode · Manual

IMPROVE RECOMMENDATIONS                               (low-key, not a hero card)
2 useful details still missing — Cuisine, Cooking preference
[Personalize →]
```

Today's Plan is the primary visual object once it exists — not the preference checklist. This
directly answers your "does this fit the meal-planner phase" question: it does, as long as the
checklist is demoted now, before Layer 2 adds Today's Plan on top of an already-crowded stack. If
the checklist stays prominent, Today's Plan will have to fight it for the top of the screen later,
which means redesigning this screen twice instead of once.

### 7.4 Don't auto-generate plans (unchanged from rev. 1)

Still true, still important: `plan_generate` is quota-limited (2/day free). Always an explicit
"Generate today's plan" tap, never on mount.

### 7.5 The `[]`/default-value ambiguity (extended from rev. 1)

Rev. 1 flagged `allergies`/`disliked_foods` (`[]` is ambiguous between "answered: none" and "never
asked"). This revision adds: **any field with a non-null server default has the same problem in
reverse** — `meal_frequency` (defaults to `4`) and `cooking_time_max` (defaults to `30`) will read
as "answered" even when untouched. The fix is the same either way: a small local
"sections visited" flag (not inferred from the field's value), tracked the same way the onboarding
draft already persists locally. Still not worth a blocking backend change — file alongside F12 —
but the checklist/contextual-ask logic must not ship reading either of these two failure modes as
"done" by accident, since that's a correctness bug users will notice within their first week, not a
someday-polish item.

---

## 8. Fitness & Wellness tabs (unchanged from rev. 1)

No changes — still Phase 6, still flagged for `?mine=true` on exercises and the water-only write
endpoint for wellness.

---

## 9. Updated information architecture

```
COREO     Overall day + at most one next-best-action (§6)
DIET      Nutrition + food log + (soon) meal plan; "Improve recommendations" lives here, small
FITNESS   Exercise (Phase 6, unchanged)
WELLNESS  Water + steps + sleep + HRV + insights once available (Phase 6, unchanged)
PROFILE   The full personalization editor (all diet-profile fields, freely editable, no urgency
          framing) — this is where "Sharpen your plan"'s complete list actually lives now
```

This is also why demoting the checklist now matters for the roadmap, not just today's screen: once
Profile owns the full editable list and Diet only ever asks 1–3 contextual questions at a time, the
meal-planner build doesn't require touching navigation again — Diet already has a clear home for
Today's Plan, and Coreo stays the overview it's supposed to be.

---

## 10. Open decisions (updated)

Carried from rev. 1 (tab labels/order, `weak-moment` cut, DOB vs. age slider, backend requests to
file, analytics gap) plus one new one:

6. **Where exactly does "Profile/Personalization" live in the nav?** Options: (a) behind the
   Profile tab if one gets added later, (b) a settings-gear entry point from Coreo/Home (the gear
   icon already present in the reviewed screens), or (c) reachable from Diet's "Improve
   recommendations" row only, with no separate top-level entry. Leaning (b) + (c) together — no new
   tab needed just for this — but worth confirming before building it.

---

## 11. Suggested build order (updated)

1. **Immediate, small fixes** — remove the back button from tab-root screens (§5); remove the `/4`
   On Track card and the duplicate macro card from Home (§6.2); stop the four-way "Not tracked yet"
   Signals grid (§6.4); fix the state-blind headline (§6.5). These are edits to already-built
   screens, not new features, and should land before anything else in this doc.
2. `targetQuality` selector (§4) — small, unblocks the headline and the targets-card badge.
3. Move the full preference checklist out of Diet-home into Profile/Personalization (§7.2/§9);
   replace it on Diet with the compact "N useful details missing" row.
4. Contextual-ask triggers (§7.2 table) — starts with just the "Generate plan → ask cuisine if
   missing" case, since that's the one Layer 2 needs anyway; the others (replace-meal,
   regeneration-reason-driven asks) land alongside their respective meal-action features rather than
   all at once.
5. Today's Plan on Diet (§7.3) — Layer 2 proper, once the above isn't fighting it for screen space.
6. Update `feature-map.md` with the new IA (§9) and F12/F13 flags once built, per that file's own
   "update this file, not just the plan doc" rule.
