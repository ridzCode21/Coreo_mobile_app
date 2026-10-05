# Design Spec — Nutrition: Food Logging & Tracking (Layer 1)

Status: **APPROVED (design)** · Owner: Jarvis · Date: 2026-07-26
Feature module: `src/features/nutrition/` · Phase: 5 (Nutrition), Layer 1 of 2

> This is the design spec (the _what_ and _why_). The step-by-step build plan (the _how_)
> lives in the companion implementation plan:
> [`2026-07-26-nutrition-food-logging-plan.md`](2026-07-26-nutrition-food-logging-plan.md).
> Reviewer lens for this project: senior RN dev + designer + AI diet/fitness expert (per
> project instructions).

---

## 1. Context & goal

Onboarding is complete; the app now needs its first real pillar. This is **Layer 1 of the
nutrition pillar: food logging + calorie/macro tracking** — "the meal logging part." A user can
log what they ate (four ways) and immediately see their remaining calorie budget and macro
progress update.

**Job to be done:** _"Tell the app what I ate in a few seconds, however it comes, and see where
that leaves me for the day — without judgment."_ (Design voice, 14a: "Went over yesterday?
Nothing turns red here. I adjust, we move on.")

Scope decisions confirmed with the owner (2026-07-26):

- **Milestone = food logging + tracking.** AI meal plans (§12/§13) + assistant (§14) are a
  separate **Layer 2** cycle. 15b/15c are later.
- **Photo + barcode ARE in scope** for this build — this **overrides** `product-context.md` §5
  (which defers them). Recorded as a scope change; §5 to be updated.
- **Diet home is the temporary `(app)` landing** until the petal-cluster Home (Phase 4) exists.
  Isolated to the route file so the swap is one line later.

Sources: API contract `docs/API_REFERENCE.md` §8 (food) + §10 (daily summary); design screens
`14a Diet home v2`, `14b Log a meal sheet`, `15a Check my math` (`designs/reference/
screens-source.html`); conventions `docs/architecture.md`, `docs/design-system.md`.

---

## 2. In scope / out of scope

**In scope (Layer 1):**

- **14a Diet home** — daily calorie budget ("Left today"), macro summary (protein/carbs/fat with
  progress bars), today's logged-entries list, entry point to logging.
- **14b Log a meal** — bottom sheet with four paths:
  - **Describe it** — food search (`GET /food/search/`) + manual entry → `POST /food/entries/`.
  - **Snap the plate** — photo AI (`POST /food/photo/`) → confirm/edit → `POST /food/entries/`.
  - **Scan barcode** — `GET /food/lookup/barcode/{barcode}/` → confirm/edit → entry.
  - **Nutrition label** — reuses the photo path (same analyze→confirm→commit flow).
- **Confirm/edit step** (styled after `15a Check my math`) — review + edit the estimate before
  committing.
- **Delete an entry** — `DELETE /food/entries/{id}/`, budget reverts.
- Loading / empty / error / offline / quota states for all of the above.
- The `nutrition` feature scaffold + mock DB tables + mock handlers for §8 and §10.

**Out of scope (Layer 2+ — do not build now):**

- `Next meal` planned-meal card on 14a; meal-plan generation (§12); meal actions (§13);
  meal assistant (§14); `15b Your usuals`; `15c Week in review`; the `78 → 72` weight chip.
- Micronutrients (macro-level only — matches `product-context.md` §5).
- The petal-cluster Home and real inter-pillar navigation (Phase 4).

---

## 3. Screens & routes

| Route (file)                          | Screen (feature)    | Design | Notes                                                  |
| ------------------------------------- | ------------------- | ------ | ------------------------------------------------------ |
| `src/app/(app)/index.tsx`             | `DietHomeScreen`    | 14a    | **Temporary landing.** Thin route → feature screen.    |
| `src/app/(app)/nutrition/confirm.tsx` | `ConfirmMealScreen` | 15a    | Confirm/edit an estimate before committing.            |
| (in-screen sheet, not a route)        | `LogMealSheet`      | 14b    | Bottom sheet opened from Diet home; not its own route. |

Routes stay thin and delegate to `src/features/nutrition/screens/*` (architecture.md §1–2).
`LogMealSheet` is a modal/bottom-sheet component owned by the Diet home screen, not a route — it's
a transient overlay, not a navigable destination. `ConfirmMealScreen` **is** a route because it
can be reached from three different logging paths and needs its own back behavior.

Orientation: Diet home is a long-lived list screen → must rotate + scroll (design-system §11.3).
The confirm screen likewise scrolls. No portrait lock here.

---

## 4. Feature architecture

```
src/features/nutrition/
  api/
    nutritionApi.ts        # nutritionKeys factory + query/mutation hooks (§6)
  mocks/
    handlers.ts            # §8 food + §10 daily-summary routes; self-registers
    fixtures.ts            # seeded food DB (search + barcode) + a starter day
  screens/
    DietHomeScreen.tsx     # 14a
    ConfirmMealScreen.tsx  # 15a-style confirm/edit
  components/
    MacroSummaryCard.tsx   # night-glass "Left today" hero (kcal + 3 macro bars)
    LogMealSheet.tsx       # 14b bottom sheet (4 tiles + voice/text bar)
    LoggingOptionTile.tsx  # one of the 4 tiles (icon + title + subtitle)
    FoodEntryRow.tsx       # a logged entry row (name · kcal, swipe/tap to delete)
    FoodSearchList.tsx     # debounced search results for "Describe it"
  lib/
    macros.ts              # pure: remaining budget, % fills, per-meal grouping
  schemas.ts               # Zod: manual entry, photo estimate, barcode item, params
  index.ts                 # public surface (screens + anything a route imports)
```

- Register `@/features/nutrition/mocks/handlers` in `src/shared/api/mock/registerAllMocks.ts`.
- Import rules (architecture.md §2): routes import only from `features/nutrition` (its `index.ts`);
  nutrition imports from `shared/*` and other features' `index.ts` only.
- Colocate-then-extract: new components live in the feature; promote to `shared/` only on a 2nd
  consumer (architecture.md §1.4).

---

## 5. Data model & types

Mirror `API_REFERENCE.md` shapes exactly (so the live swap is a no-op). New shared types:

- `src/shared/types/food.ts`:
  - `FoodEntry` — `{ id, date, meal_type, food_name, calories, protein_g, carbs_g, fat_g,
source, created_at }` (§8).
  - `FoodItem` — `{ id, barcode, name, calories_per_100g, protein_g_per_100g,
carbs_g_per_100g, fat_g_per_100g, source, last_fetched }` (§8).
  - `MacroSummary` — `{ calories_in, protein_g, carbs_g, fat_g }` (§8 GET entries).
  - `DailyTotals` — `{ calories_in, protein_g, carbs_g, fat_g, calories_out, net_calories }`
    (returned on entry create).
  - `PhotoEstimate` — `{ name, portion_grams, est_calories, est_protein_g, est_carbs_g,
est_fat_g }` (§8 photo).
  - Enums: `MealType = 'breakfast'|'lunch'|'dinner'|'snack'`, `FoodSource =
'photo'|'barcode'|'manual'|'import'|'plan'`.
- `src/shared/types/dailyLog.ts`: `DailyLog` (§10) — the read-only daily aggregate.

Macro targets (the _budget_ the "Left today" card counts down from) come from the existing diet
profile (`daily_calories`, `daily_protein_g`, `daily_carbs_g`, `daily_fat_g` — `DietProfile`,
already typed in `shared/types/dietProfile.ts`), read via `GET /users/me/diet-profile/`.
`remaining = target − macro_summary` is computed in `lib/macros.ts` (pure), not stored.

---

## 6. Data layer (TanStack Query)

Per architecture.md §3–4: all server data via Query; one query-key factory per feature.

```ts
// nutritionKeys
all: ['nutrition']
dailySummary(date): ['nutrition','daily-summary', date]
foodEntries(date):  ['nutrition','food-entries', date]
foodSearch(q):      ['nutrition','food-search', q]
barcode(code):      ['nutrition','barcode', code]
```

Hooks (all through `shared/api/client.ts`; food routes are **Style B** bare payloads):

| Hook                           | Endpoint                              | Notes                                                                  |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| `useDailySummaryQuery(date)`   | `GET /daily-summary/`                 | The day's `DailyLog` + net calories + entries. Default `date` = today. |
| `useFoodEntriesQuery(date)`    | `GET /food/entries/`                  | `{ entries, macro_summary }`. Primary source for the day list + card.  |
| `useDietProfileQuery()`        | `GET /users/me/diet-profile/`         | Reuse onboarding's hook if exported; else add read-only here. Targets. |
| `useFoodSearchQuery(q)`        | `GET /food/search/?q=`                | `enabled: q.length >= 2`, debounced ~300ms, `keepPreviousData`.        |
| `useBarcodeLookup(code)`       | `GET /food/lookup/barcode/{barcode}/` | On-demand (enabled when a code is scanned).                            |
| `useAnalyzePhotoMutation()`    | `POST /food/photo/` (multipart)       | Returns `PhotoEstimate`. Does NOT create an entry.                     |
| `useCreateFoodEntryMutation()` | `POST /food/entries/`                 | On success → invalidate `foodEntries(date)` + `dailySummary(date)`.    |
| `useDeleteFoodEntryMutation()` | `DELETE /food/entries/{id}/`          | Same invalidation. Optimistic remove + rollback on error.              |

Which query feeds the card + list: **`useFoodEntriesQuery`** provides both the day's `entries` and
`macro_summary` in one call — use it as the primary source for 14a. `useDailySummaryQuery` is only
needed for fields `entries` doesn't carry (net calories, water, exercise) — **not required for
Layer 1**; include the hook but the Diet home card is driven by `food/entries` + diet-profile
targets. (Recorded as an intentional simplification; revisit when Layer 2 adds exercise/net-cal.)

---

## 7. Mock layer

Extend `src/shared/api/mock/db.ts`:

```ts
foodEntries: FoodEntry[]                 // all users' entries; filtered per requireMockUser
dailyLogs: Record<string, DailyLog>      // key: `${userId}:${date}`
foodItems: FoodItem[]                    // seeded search/barcode DB (fixtures.ts)
photoQuotaByUserDate: Record<string,number> // enforce 10/day photo limit (§8)
```

Handlers in `nutrition/mocks/handlers.ts` (Style B via `styleB`; framework 401 via `styleAError`,
matching `dietProfile.handlers.ts` precedent), each with a small `delayMs` so loading states are
real:

- `GET /food/entries/` — filter by `date` query; compute `macro_summary` by summing the day's
  entries; return `{ entries, macro_summary }`.
- `POST /food/entries/` — validate (Zod-mirrored DRF field errors on bad input), append, recompute
  the day's `DailyLog`, return the created `FoodEntry` + `daily_totals`.
- `DELETE /food/entries/{id}/` — 404 if not the user's; else remove + recompute; 204.
- `GET /food/search/` — substring match over `foodItems` by `q`, respect `page_size`.
- `GET /food/lookup/barcode/{barcode}/` — exact match → `FoodItem`; else 404
  `{ detail: 'Food item not found.' }`.
- `POST /food/photo/` — return a plausible `PhotoEstimate` after latency. **Faithfully simulate
  the failure modes:** 400 (missing/too-large image), 422 ("Photo couldn't be analyzed. Enter
  your meal manually."), and 429 after 10 calls/day ("Daily photo limit reached...").
- Seed: on first access, create a starter day with 1–2 entries so the screen isn't empty on first
  demo (mirrors how `dietProfile.handlers.ts` lazily seeds).

Mock fidelity is what lets the live backend swap be a no-op — the same request/response shapes,
both envelope styles, real latency, and the real error/quota bodies (implementation-plan.md §2).

---

## 8. State ownership (architecture.md §3)

- **Server data** (summary, entries, search, barcode, photo result) → **TanStack Query**. Never
  cached in Zustand.
- **Log sheet open/closed**, selected logging path → **local `useState`** in `DietHomeScreen`.
- **Confirm screen editable draft** (name/portion/kcal/macros/meal_type before commit) → **React
  Hook Form + Zod** (`schemas.ts`), seeded from the estimate/`FoodItem`/blank-manual.
- **Photo capture** → `expo-image-picker` result held in local state only until analyzed; the file
  is uploaded, never persisted client-side.
- No new Zustand store needed.

---

## 9. Components — reuse vs. new

**Reuse:** `GlassCard` (night variant for the "Left today" hero; light for tiles/rows), `Screen`
(safe-area + scroll + responsive width), `VoiceInputBar` (the 14b text/voice input), `WaveMark`
(header/empty states), theme `tokens` + `textStyle()`.

**New (feature-local first):** `MacroSummaryCard`, `LogMealSheet`, `LoggingOptionTile`,
`FoodEntryRow`, `FoodSearchList`, `macros.ts`.

**Design fidelity notes (design-system.md):**

- "Left today" is the one **night-glass hero card** per screen (§4 law). `1,240` is a hero
  number: weight 200, oversized, small `kcal` unit beside it (§2). Macro bars are **thin fills**
  (`rgba(ink,.16)` track, `rgba(ink,.6)` fill), matching 14a — **not** wave charts (waves are for
  time-series; §6.1 hard rule).
- No `coreBlue` except a single primary action (the confirm "Looks right" / "Log it" button) (§1
  law 4). No red on over-budget — over-budget shows neutral + the "I adjust, we move on" copy
  (§10 voice; brand law 2).
- Sub-18px text over atmosphere sits on glass/scrim (§1 contrast rule).
- All design values from tokens — zero hardcoded colors/spacing/type (CLAUDE.md §6).
- Voice/copy from the design source verbatim where it exists (14a/14b/15a strings); new copy
  follows §10 (first person, calm, cites the user's own numbers, no exclamation/emoji).

---

## 10. States & edge cases

- **Loading:** skeleton on the hero card + a few shimmer rows; never a bare spinner on atmosphere.
- **Empty (no entries yet):** `EmptyOrErrorState` pattern — calm headline + "Log a meal" primary,
  never red (design-system §7). Card still shows the full budget as "left today".
- **Photo 422 / 429:** surface the API's own message; route the user to manual entry (the fallback
  the API explicitly intends). 429 can show `quota_resets_at` if present.
- **Food DB 503** (search/barcode): "That lookup's down for a moment — describe it instead" →
  manual entry.
- **Offline:** Query shows cached day if present; mutations queue-fail with a retry affordance
  (no silent loss). Full offline sync is out of scope (product-context §8 — not required in mock
  phase).
- **Over budget:** neutral remaining (can go negative or show "0 left"); copy adjusts, no red.
- **Delete:** optimistic removal; rollback + toast on failure.
- **Type scaling** to ~135% without clipping the hero number (design-system §2).
- **Responsive:** verified at 375pt and 430pt widths and in landscape (scroll, no clip).

---

## 11. Flags surfaced (not silently decided)

- **F-N1 — Photo/barcode override.** Building §8 photo + barcode **overrides** `product-context.md`
  §5's deferral. Owner-approved 2026-07-26. **Action:** update §5 + `feature-map.md` /
  `design-system.md` §9 to record photo/barcode as in-scope for MVP.
- **F-N2 — 15a itemized breakdown vs. aggregate photo API.** `15a Check my math` shows a
  _per-ingredient_ editable breakdown ("Steamed rice 1 cup · 205 kcal", "Paneer 80g · 235 kcal",
  a "Fix" affordance on an uncertain item). But `POST /food/photo/` returns a **single aggregate**
  estimate (one `name` + total macros), and `POST /food/entries/` stores one aggregate row.
  **Decision:** build the confirm screen to the API's actual aggregate shape (edit name/portion/
  kcal/macros for the whole meal). The itemized/line-item treatment needs a backend change
  (multi-item photo response + line-item entries) — **flagged for Layer 2 / backend**, not faked.
- **F-N3 — Diet-as-landing is throwaway.** Pointing `(app)/index.tsx` at Diet home is temporary;
  isolate it to the route file so the Phase-4 petal-cluster Home swap is a one-line change.
- **F-N4 — `expo-image-picker` is a new dependency** (camera/photo capture). Not in the §3 stack
  table. Per CLAUDE.md §6 it's flagged before install; it doesn't overlap an existing lib. (Expo
  SDK 57 — verify the versioned API before use per CLAUDE.md §2.)
- **F-N5 — daily-summary vs. food/entries overlap.** Both can feed the card; Layer 1 drives the
  card from `food/entries` + diet-profile targets and defers `daily-summary` wiring to Layer 2
  (when net calories / exercise appear). Intentional simplification.

---

## 12. Acceptance criteria

- [ ] Diet home renders the "Left today" night-glass card with kcal + P/C/F bars from live
      (mock) data + diet-profile targets, and the day's entries list.
- [ ] Log via **Describe it** (search + manual), **Snap the plate** (photo→confirm), and **Scan
      barcode** (lookup→confirm) each create an entry; the card + list update immediately.
- [ ] Nutrition-label tile reuses the photo→confirm flow.
- [ ] Delete an entry → the budget reverts.
- [ ] Photo 422 and 429 both degrade gracefully to manual entry with the API's own copy; food-DB
      503 handled; empty and loading states are calm (never red).
- [ ] No `coreBlue` misuse, no red over-budget, no wave chart used for macros, no hardcoded design
      values; hero number scales to 135% without clipping.
- [ ] Works at 375pt and 430pt and in landscape (scrolls, no clip).
- [ ] Mock handlers match `API_REFERENCE.md` §8/§10 shapes + both envelope styles + error/quota
      bodies exactly (live swap = no feature-code change).
- [ ] `pr-review` checklist passed; `product-context.md` §5 updated for F-N1.

---

## 13. Doc updates this spec requires

- `product-context.md` §5 — move barcode/photo logging out of "out of scope" for MVP (F-N1).
- `feature-map.md` — nutrition row status → in progress (Layer 1); note photo/barcode in scope.
- `design-system.md` §9 — update the 21A/21B + 25A photo-logging deferral note (F-N1).
- `CLAUDE.md` §3 stack table — add `expo-image-picker` once installed (F-N4).
- `architecture.md` §2 repo map — add `features/nutrition` once built.
