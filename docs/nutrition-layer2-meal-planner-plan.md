# Nutrition Layer 2 — Meal Planner implementation plan

Status: **IMPLEMENTED against mock APIs (2026-08-19).** Scope: `API_REFERENCE.md` §12 (meal plans), §13
(meal actions), §14 (meal assistant — the meal-plan-context part only, see §8 below), and the
`plan_generate`/`plan_regenerate`/`recipe_generate`/`replace_preview`/`assistant` quotas in §16.
Builds directly on top of `docs/onboarding-v3-minimal-drip-plan.md` rev. 2 — Diet tab's §7.3 layout
("Today's Plan" as the primary object) and §7.2's contextual-ask triggers are the IA this plan
implements against, not a new design.

Written against the actual Layer-1 code (`nutritionApi.ts`, `mock/router.ts`, `mock/db.ts`,
`shared/api/client.ts`, `features/nutrition/index.ts`) so every pattern below is "do it the way
Layer 1 already does it," not a new convention.

---

## 1. What's in scope, what isn't

**In scope (this plan):**

- Generate / fetch / regenerate a meal plan (§12)
- Meal actions: recipe view, log, skip, adjust-quantity, feedback, replace (preview+confirm),
  "ate something else" (§13)
- The guided meal-plan assistant — prompt buttons + proposal/confirm (§14), scoped to
  `context=meal_plan` only
- Quota handling for all five rate-limited actions (§16)

**Explicitly not in scope here** (per `feature-map.md`'s own phase split, not a scope change):

- The standalone presence/chat screen (18c, `PresenceOrb`) — that's Phase 7. This plan wires the
  _API_ the assistant needs, exposed as inline prompt buttons on the meal plan itself, not a
  freeform chat surface.
- Fitness/Wellness — unaffected.
- Any real LLM — `product-context.md`'s own assumption is "rule/template-based suggestions dressed
  as AI-assisted" for MVP; the mock generates plausible data, same as Layer 1's mock photo/barcode
  handlers already do.

---

## 2. New shared types — `shared/types/mealPlan.ts`

Mirrors `API_REFERENCE.md` §12/§13/§14/§17 exactly, same convention as `dietProfile.ts`/`food.ts`:

```ts
export const MEAL_PLAN_STATUSES = [
  'pending',
  'generating',
  'validating',
  'ready',
  'failed',
] as const;
export type MealPlanStatus = (typeof MEAL_PLAN_STATUSES)[number];

export const PLANNED_MEAL_STATUSES = [
  'planned',
  'logged_as_planned',
  'logged_modified',
  'skipped',
  'replaced',
  'eaten_outside',
  'missed',
] as const;
export type PlannedMealStatus = (typeof PLANNED_MEAL_STATUSES)[number];

export const REGENERATION_REASONS = [
  'too_boring',
  'too_expensive',
  'too_much_cooking',
  'dont_like_foods',
  'need_more_protein',
  'make_lighter',
  'different_cuisine',
  'surprise_me',
] as const;
export type RegenerationReason = (typeof REGENERATION_REASONS)[number];

export const FEEDBACK_TYPES = [
  'like',
  'dislike',
  'too_heavy',
  'too_light',
  'too_much_cooking',
  'too_expensive',
  'not_available',
  'other',
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type PlannedMeal = {
  id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  rationale: string;
  recipe_json: unknown | null;
  replaced_at: string | null;
  replacement_of_id: number | null;
  constraint_violation: boolean;
  status: PlannedMealStatus;
  serving_size: string;
  portion_multiplier: number;
  base_calories_kcal: number | null;
  base_protein_g: number | null;
  base_carbs_g: number | null;
  base_fat_g: number | null;
  ingredients_json: { name: string; quantity: string }[];
  prep_time_minutes: number;
  estimated_cost_tier: 'budget_friendly' | 'moderate' | 'premium';
  confidence_note: string;
};

export type ValidationResult = {
  self_check_status: string;
  macro_ok: boolean;
  violation_count: number;
  self_check_issues: string[];
};

export type MealPlanDetail = {
  id: number;
  status: MealPlanStatus;
  date_start: string;
  date_end: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  validation_result: ValidationResult;
  self_check_status: string;
  plan_mode: 'standard' | 'historical';
  historical_fallback_reason: string;
  meals: PlannedMeal[];
};

export type QuotaAction =
  'assistant' | 'plan_generate' | 'plan_regenerate' | 'recipe_generate' | 'replace_preview';

/** §16 quota-exceeded body — shared shape across all five rate-limited actions. */
export type QuotaExceededError = {
  error: 'quota_exceeded';
  action: QuotaAction;
  message: string;
  limit: number;
  tier: 'free' | 'premium';
  quota_resets_at: string;
};

export type AssistantPromptOption = { id: number; display_text: string };

export type AssistantProposal = {
  proposal_id: string;
  summary: string;
  requires_confirmation: true;
  preview: unknown;
  expires_at: string;
};

export type AssistantIntent =
  | 'replace_meal'
  | 'modify_meal'
  | 'adjust_quantity'
  | 'skip_meal'
  | 'log_meal'
  | 'ate_something_else'
  | 'regenerate_plan'
  | 'submit_feedback'
  | 'get_recipe';
```

---

## 3. Mock backend extension — `mockDb` + new handlers

### 3.1 `mock/db.ts` additions

```ts
type MockDb = {
  // ...existing fields
  /** Keyed `${userId}:${date}`. One plan per user per day (§12's idempotent-create rule). */
  mealPlans: Record<string, MealPlanDetail>;
  /** Preview tokens for the replace flow, TTL 600s (§13). Cleared on confirm or expiry check. */
  replacePreviews: Record<
    string,
    { userId: string; mealId: number; alternatives: unknown[]; expiresAt: number }
  >;
  /** Per-action-per-user-per-day counters for the five §16 quotas, e.g. `plan_generate:${userId}:${date}`. */
  quotaCounters: Record<string, number>;
  /** Recipes generated lazily so `recipe_generate` quota only charges once per meal (§13's "first view" rule). */
  generatedRecipeMealIds: Set<number>;
  nextPlannedMealId: number;
};
```

### 3.2 Async plan-generation state machine

Layer 1 has no precedent for a multi-poll async job (import's `task_id` pattern exists in the API
but isn't mocked yet either) — this is new mock infrastructure, worth building once and reusing for
both `POST /meal-plans/` and `.../regenerate/`:

```ts
// shared/api/mock/asyncJob.ts (new, generic — not nutrition-specific, since import/{task_id}/
// will want the exact same pattern later)
export function advanceOnPoll<T extends { status: string }>(
  entity: T,
  transitions: string[], // e.g. ['pending', 'generating', 'validating', 'ready']
  pollCountKey: string, // caller tracks how many times this entity has been GET-polled
): T;
```

Concretely for meal plans: `POST /meal-plans/` creates the record at `status: 'pending'` and returns
`202`. Each subsequent `GET /meal-plans/{date}/` advances one step
(`pending → generating → validating → ready`) until `ready`, simulating the real async worker
without a real one — same spirit as `implementation-plan.md` §2's existing "async jobs" requirement
for meal plans, which was already documented but never built. 3–4 polls to `ready` matches a
believable few-second generation feel with the existing artificial `delayMs` pattern.

### 3.3 New handler file — `features/nutrition/mocks/mealPlan.handlers.ts`

Registered exactly like `dietProfile.handlers.ts` (add one line to `registerAllMocks.ts`). One
handler per route in §12/§13/§14. A few implementation notes worth calling out because they're easy
to get subtly wrong:

- **`POST /meal-plans/` idempotency**: if a plan already exists for that date, return it as `200`
  (not `202`) _without_ incrementing the `plan_generate` counter — §12 is explicit that re-requesting
  an existing plan "does not consume quota." This is the one quota rule that's easy to get backwards.
- **`POST /meal-plans/{date}/regenerate/`** discards the existing plan and creates a new one at
  `pending`, _does_ increment `plan_regenerate` (separate counter from `plan_generate`).
- **Recipe quota**: `GET .../recipe/` only increments `recipe_generate` the _first_ time for a given
  meal id (checked via `generatedRecipeMealIds`); subsequent views of the same meal's recipe are free,
  matching §13's "first view logs a `recipe_view` event; generation may consume quota" wording.
- **Replace preview token TTL**: store `expiresAt = Date.now() + 600_000` (mock-only use of
  `Date.now()` — fine here since this is app runtime code, not a Workflow script); confirm checks
  the token exists _and_ hasn't expired, returning `404 preview_not_found` for either case (§13
  doesn't distinguish "never existed" from "expired" in its error shape, so neither should the mock).
- **`ate-something-else`** needs `remaining_calories` in its response — compute from the diet
  profile's `daily_calories` minus today's `daily_log.calories_in` after inserting the new entry, not
  a separate stored value.
- **Assistant proposals**: store the pending proposal (intent + payload) keyed by `proposal_id`,
  same 600s-expiry pattern as replace-preview; `confirm` dispatches to the same underlying action
  handler the direct endpoint would call (e.g. a `replace_meal` proposal's confirm calls the same
  logic `replace/confirm` uses) so there's exactly one implementation of each mutation, not two.

---

## 4. API hooks — `features/nutrition/api/mealPlanApi.ts`

Same one-hook-per-endpoint convention as `nutritionApi.ts`. Key design decisions:

```ts
export const mealPlanKeys = {
  all: ['mealPlan'] as const,
  byDate: (date: string) => ['mealPlan', date] as const,
  assistantPrompts: (context: string) => ['mealPlan', 'assistant-prompts', context] as const,
};

/** GET /meal-plans/{date}/ — polls automatically while the plan is mid-generation. */
export function useMealPlanQuery(date: string) {
  return useQuery({
    queryKey: mealPlanKeys.byDate(date),
    queryFn: () => apiClient.get<MealPlanDetail>(`/meal-plans/${date}/`),
    // §12: pending|generating|validating are transient; poll every 2s until ready/failed, then stop.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'ready' || status === 'failed' ? false : 2000;
    },
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2, // no plan yet ≠ retry
  });
}

/** POST /meal-plans/ — explicit tap only, never on mount (§7.4 of the IA plan — quota-limited). */
export function useCreateMealPlanMutation(date: string) {
  /* mutate → invalidate byDate(date) */
}

export function useRegenerateMealPlanMutation(date: string) {
  /* body: { regeneration_reason, plan_mode } */
}

export function useMealRecipeQuery(date: string, mealId: number, enabled: boolean) {
  /* lazy */
}

export function useLogMealMutation(date: string) {
  /* POST .../log/, body: { actual_calories? } */
}
export function useSkipMealMutation(date: string) {
  /* POST .../skip/ */
}
export function useAdjustQuantityMutation(date: string) {
  /* POST .../adjust-quantity/ */
}
export function useMealFeedbackMutation(date: string) {
  /* POST .../feedback/ */
}

export function useReplacePreviewMutation(date: string) {
  /* POST .../replace/preview/ */
}
export function useReplaceConfirmMutation(date: string) {
  /* POST .../replace/confirm/ */
}

export function useAteSomethingElseMutation(date: string) {
  /* POST /meal-plans/{date}/ate-something-else/ */
}

export function useAssistantPromptsQuery(context: 'meal_plan') {
  /* GET /meals/assistant-prompts/ */
}
export function useAssistantMutation(date: string) {
  /* POST /meal-plans/{date}/assistant/ */
}
export function useAssistantConfirmMutation(date: string) {
  /* POST .../assistant/confirm/ */
}
```

All mutations that mutate a meal (log/skip/adjust/replace-confirm/assistant-confirm) invalidate both
`mealPlanKeys.byDate(date)` **and** `nutritionKeys.dailySummary(date)` — logging a planned meal
creates a real `FoodEntry` (source `plan`) per §13, so Diet's calorie/macro numbers (owned by
`nutritionApi.ts`, unchanged) need to refresh too. This is the one place Layer 1 and Layer 2 code
actually touch each other.

### 4.1 Quota errors — one shared handler, not five

Every mutation above can 429 with the same `QuotaExceededError` shape. Add one small shared utility
(`features/nutrition/lib/quotaError.ts`) that type-guards an `ApiError` into that shape, and one
`<QuotaBanner error={...} />` component that renders `message` + a relative "resets in Xh" from
`quota_resets_at`. Every screen below reuses this instead of five bespoke error renderings.

---

## 5. Screens — mapped to the rev. 2 Diet IA

### 5.1 Diet tab root — "Today's Plan" card states

Exactly the layout rev. 2 §7.3 already specified; the state machine behind it:

| `useMealPlanQuery` result               | Card shows                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| 404 (no plan requested yet)             | `"No plan yet — [Generate today's plan]"` (explicit tap, §7.4)                              |
| `pending` / `generating` / `validating` | Compact spinner row: `"Building your plan…"` (polling handles the rest)                     |
| `ready`                                 | Meal rows (breakfast/lunch/dinner/snack present), each tappable → meal detail               |
| `failed`                                | `"Couldn't build your plan — [Retry]"` (retry = regenerate with no reason, or just re-POST) |

Tapping "Generate" is where the **cuisine contextual ask** (rev. 2 §7.2) intercepts: if
`cuisine_preference` is null, show the one-question sheet first, `PUT` it, _then_ `POST
/meal-plans/`. This is the first and highest-priority entry in that contextual-ask table — build it
before the others.

### 5.2 Full plan screen (`(tabs)/diet/plan`)

Pushed from "See full plan." All meals for the day, each row showing the same summary as the card
plus a status badge (`logged_as_planned`, `skipped`, `replaced`, etc. per `PlannedMealStatus`).
Header shows the plan's `validation_result` only if `macro_ok` is false — surface real self-check
issues (`self_check_issues`) rather than hiding them, since `product-context.md` §6 wants honesty,
not silent numbers that don't add up.

### 5.3 Meal detail (`(tabs)/diet/meal/[id]`)

- Header: name, calories/macros, `serving_size`, `prep_time_minutes`, `estimated_cost_tier`.
- Ingredients list (`ingredients_json`).
- Recipe section: lazy — only fetched on this screen's mount via `useMealRecipeQuery`, quota-aware
  (`QuotaBanner` on 429).
- Actions row: **Log** (opens a tiny "ate as planned?" confirm, optional `actual_calories` override —
  this is the one place `logged_modified` vs `logged_as_planned` gets decided), **Skip**, **Adjust
  portion** (pushes a small sheet with `SliderRow`, reusing the existing component, `0.01`–`3.0`
  range, `1.0` = reset), **Replace** (see 5.4), **Feedback** (a `SelectableChip` row of
  `FeedbackType`, optional note).

This screen is a _pushed_ screen inside the Diet tab's own stack (per rev. 2 §5's navigation rule),
so it gets a real back button — unlike the Diet tab root, which must not have one.

### 5.4 Replace flow (two screens, matching §13's preview→confirm split)

- **Preview sheet**: optional free-text preference (`VoiceInputBar`, already built), submit →
  `useReplacePreviewMutation`. Loading → 3 alternative cards. 429/503 → `QuotaBanner`/"try again
  shortly" respectively (§13 documents both as distinct failure modes — don't collapse them into one
  generic error).
- **Confirm**: user taps one alternative → `useReplaceConfirmMutation({ preview_token,
chosen_index })`. Show a visible countdown or at least don't let the sheet sit open past 600s
  silently — if the token expires mid-read, the confirm call's `404 preview_not_found` should re-open
  the preview step with a plain "that expired, let's try again" message, not a raw error.

### 5.5 Regenerate flow — the second contextual-ask trigger point

Reason picker (`RegenerationReason` chips) → on selecting `too_expensive` or `too_much_cooking`
specifically, check whether `budget_tier`/`cooking_frequency` are already set; if not, show the
one-question ask _before_ firing the regenerate call (rev. 2 §7.2's second and third trigger rows).
Other reasons regenerate immediately with no extra question.

### 5.6 "Ate something else" — quick log from a meal slot

A lighter-weight alternative to full replace, triggered from a meal row's overflow/long-press rather
than its own screen: description + approx calories/protein (carbs/fat default to 0 per §13), submit
→ `useAteSomethingElseMutation`. Marks that slot `eaten_outside` and creates the entry in one call —
no separate confirm step needed since there's no AI-generated alternative to choose between (unlike
replace).

### 5.7 Assistant — prompt buttons only, not a chat screen (per §1's scope line)

A single row of buttons above or below Today's Plan, populated from
`useAssistantPromptsQuery('meal_plan')`. Tapping one calls `useAssistantMutation`; a `recipe`
response opens the meal-detail-style recipe view inline; a `proposal` response shows a small
confirm sheet (`summary` + `[Confirm]`/`[Not now]`) that calls `useAssistantConfirmMutation` on
accept. This reuses the meal-detail and replace-preview visual patterns rather than introducing new
ones — it's the same "propose → confirm" shape as replace, just assistant-initiated. The full
`PresenceOrb` chat experience (18c) stays Phase 7; this is just wiring the same backend endpoints
through a much simpler surface first.

---

## 6. Build order

1. **Types + mock infrastructure** (§2, §3) — the generic async-job-poll helper is worth building
   right even though only meal plans use it today, since import/{task_id}/ will want it later.
2. **`mealPlanApi.ts` hooks** (§4) + the shared `QuotaBanner`/quota-error utility — build the utility
   before the first screen that needs it, not after the third one duplicates the same error UI.
3. **Today's Plan card + generate flow** (§5.1), including the cuisine contextual ask — this is the
   one Diet-home change and the highest-value slice; ship and verify this before the rest.
4. **Meal detail + log/skip/adjust/feedback** (§5.3) — the everyday-use actions.
5. **Replace flow** (§5.4) — two screens, higher complexity (token TTL), lower daily-use frequency
   than #4, hence after it.
6. **Regenerate + its contextual asks** (§5.5).
7. **Ate-something-else** (§5.6) — small, can slot in anywhere after #3.
8. **Assistant prompt buttons** (§5.7) — last, since it's the least-specified of the six ("MVP
   assistant is Q&A-over-your-data" per `product-context.md`, so the exact prompt copy/behavior
   benefits from the rest of the plan already being live to react to).

---

## 7. Open decisions

1. **Poll interval/backoff** — 2s fixed is simple; a real generation job might want backoff (2s, 3s,
   5s…) to avoid hammering a real backend once this goes live. Fine to ship fixed-2s for the mock and
   revisit at the live-API cutover.
2. **"Ate something else" entry point** — is a long-press/overflow menu on a meal row discoverable
   enough, or does it need its own visible button? Low-risk to ship the simpler version first and
   watch for confusion.
3. **Assistant prompt button copy** — `GET /meals/assistant-prompts/` returns whatever `display_text`
   the backend seeds; the mock needs to seed something reasonable (e.g. "Make it lighter," "Swap
   dinner," "I'm not hungry today") — worth a short pass deciding the initial set, since this is
   product copy, not just plumbing.
4. **Does regenerate's contextual ask ever feel like it's re-litigating** an answer the user already
   gave in the tier-1 flow? E.g. if `cooking_frequency` was already set during onboarding-drip, don't
   ask it again on `too_much_cooking` — always check `ProfileCompletion` before asking, never ask
   unconditionally on a reason match.
