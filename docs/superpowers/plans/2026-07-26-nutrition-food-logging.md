# Nutrition — Food Logging & Tracking (Layer 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the nutrition pillar's food-logging + calorie/macro-tracking milestone — a Diet home (14a) that shows the day's calorie budget + macros + entries, and a Log-a-meal flow (14b) with four entry paths (describe/search, photo, barcode, nutrition-label) that write real (mock-backed) food entries.

**Architecture:** New `src/features/nutrition/` module following the established feature pattern (`api/` Query hooks, `mocks/handlers.ts`, `schemas.ts`, `screens/`, `components/`, `lib/`, `index.ts`). Server data through TanStack Query against the real `API_REFERENCE.md` §8/§10 contract; all endpoints mock-backed via the existing `shared/api/mock` router so the live swap is a zero-feature-code-change flag flip. Diet home is the temporary `(app)` landing, isolated to the route file.

**Tech Stack:** Expo SDK 57 / RN 0.86 / TypeScript strict · Expo Router (typed routes) · TanStack Query · React Hook Form + Zod · Zustand (existing, not extended here) · `expo-image-picker` (NEW — photo capture) · design-system tokens + `GlassCard`/`VoiceInputBar`/`Screen`/`WaveMark`.

Companion design spec: [`docs/superpowers/specs/2026-07-26-nutrition-food-logging-design.md`](../specs/2026-07-26-nutrition-food-logging-design.md).

## Global Constraints

Every task's requirements implicitly include these (verbatim from the spec + CLAUDE.md):

- **TypeScript strict, no `any`** unless justified in a comment (CLAUDE.md §6).
- **Server data only through TanStack Query** — never fetch-and-`useState`, never in Zustand (CLAUDE.md §6).
- **No design values hardcoded** — reference `shared/theme/tokens.ts` for every color/spacing/radius/type (CLAUDE.md §6, design-system §1–3).
- **Feature-based structure** — routes in `src/app/*` stay thin and delegate to `src/features/nutrition/*`; import only via a feature's `index.ts` public surface (architecture.md §1–2).
- **Mock shapes mirror `API_REFERENCE.md` exactly** — food routes are **Style B** (bare payload); framework 401 uses **Style A** `styleAError` (API_REFERENCE §2, precedent in `dietProfile.handlers.ts`).
- **Design laws:** one night-glass hero card per screen; `coreBlue` only on the single primary action per screen; **no red** on over-budget (neutral + "I adjust, we move on" voice); **macros render as thin bar fills, never wave charts** (waves are time-series only, design-system §6.1); sub-18px text over atmosphere sits on glass/scrim.
- **Copy:** use the design source's verbatim strings for 14a/14b/15a where they exist; new copy is first-person, calm, cites the user's own numbers, no exclamation marks, no emoji (design-system §10).
- **Expo API currency:** verify any `expo-image-picker` / RN API against the SDK 57 docs (`https://docs.expo.dev/versions/v57.0.0/`) before use (CLAUDE.md §2).
- **Testing is deferred** (CLAUDE.md §7): do NOT install Jest/RNTL/Maestro. Per-task verification = `npx tsc --noEmit` (typecheck) + `npx eslint <files>` + a described runtime check in `EXPO_PUBLIC_API_MODE=mock`. Write logic as pure, isolated functions so tests drop in later.
- **Responsive:** every screen scrolls (no fixed-height clip) and works at 375pt + 430pt + landscape (design-system §11).

> **⚠️ Git note (environmental):** commits cannot be made from the agent sandbox (the mounted `.git` blocks lock-file removal). The `git commit` step in each task is the instruction for the human/executor to run in their own terminal. If executing inline in the sandbox, stage the intent and let the user commit. Commit messages below are the canonical ones to use.

---

## File structure (created / modified)

**Created:**

```
src/shared/types/food.ts                       # FoodEntry, FoodItem, MacroSummary, DailyTotals, PhotoEstimate, enums
src/shared/types/dailyLog.ts                   # DailyLog (§10)
src/features/nutrition/index.ts                # public surface
src/features/nutrition/schemas.ts              # Zod: manual entry, confirm form, params
src/features/nutrition/lib/macros.ts           # pure: remaining budget, % fills, grouping
src/features/nutrition/api/nutritionApi.ts     # nutritionKeys + query/mutation hooks
src/features/nutrition/mocks/fixtures.ts       # seeded food DB + starter day
src/features/nutrition/mocks/handlers.ts       # §8 + §10 mock routes
src/features/nutrition/components/MacroSummaryCard.tsx
src/features/nutrition/components/LoggingOptionTile.tsx
src/features/nutrition/components/LogMealSheet.tsx
src/features/nutrition/components/FoodEntryRow.tsx
src/features/nutrition/components/FoodSearchList.tsx
src/features/nutrition/screens/DietHomeScreen.tsx    # 14a
src/features/nutrition/screens/ConfirmMealScreen.tsx # 15a-style confirm/edit
src/app/(app)/nutrition/confirm.tsx            # thin route → ConfirmMealScreen
```

**Modified:**

```
src/shared/api/mock/db.ts                      # + foodEntries, dailyLogs, foodItems, photoQuota
src/shared/api/mock/registerAllMocks.ts        # + import nutrition handlers
src/app/(app)/index.tsx                        # temporary → DietHomeScreen (isolated)
package.json                                   # + expo-image-picker
app.config.ts                                  # + camera/photo permission strings (iOS/Android)
docs/product-context.md                        # §5 photo/barcode now in scope (F-N1)
docs/feature-map.md                            # nutrition row status
docs/design-system.md                          # §9 photo-logging note (F-N1)
docs/architecture.md                           # §2 repo map + features/nutrition
CLAUDE.md                                       # §3 stack table + expo-image-picker
```

---

## Task 1: Shared types (food + daily log)

**Files:**

- Create: `src/shared/types/food.ts`
- Create: `src/shared/types/dailyLog.ts`

**Interfaces:**

- Produces: `FoodEntry`, `FoodItem`, `MacroSummary`, `DailyTotals`, `PhotoEstimate`, `MealType`, `FoodSource`, `DailyLog` — consumed by every later nutrition task.

- [ ] **Step 1: Write `food.ts`** — exact shapes from API_REFERENCE §8 / §17:

```ts
// src/shared/types/food.ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'photo' | 'barcode' | 'manual' | 'import' | 'plan';

/** A logged food entry — API_REFERENCE.md §8 <FoodEntry>. */
export type FoodEntry = {
  id: number;
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
  created_at: string; // ISO
};

/** A food-database item (search + barcode) — §8 <FoodItem>. */
export type FoodItem = {
  id: number;
  barcode: string | null;
  name: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  source: string; // e.g. 'openfoodfacts'
  last_fetched: string; // ISO
};

/** The day's running macro totals — §8 GET /food/entries/ macro_summary. */
export type MacroSummary = {
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** Returned alongside a created entry — §8 POST /food/entries/ daily_totals. */
export type DailyTotals = MacroSummary & {
  calories_out: number;
  net_calories: number;
};

/** AI photo estimate — §8 POST /food/photo/. An ESTIMATE; user confirms before it becomes an entry. */
export type PhotoEstimate = {
  name: string;
  portion_grams: number;
  est_calories: number;
  est_protein_g: number;
  est_carbs_g: number;
  est_fat_g: number;
};
```

- [ ] **Step 2: Write `dailyLog.ts`** — §10 `<DailyLog>`:

```ts
// src/shared/types/dailyLog.ts
import type { FoodEntry } from '@/shared/types/food';

/** Read-only daily aggregate — API_REFERENCE.md §10 <DailyLog>. */
export type DailyLog = {
  id: number;
  date: string;
  calories_in: number;
  calories_out: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  steps: number;
  weight_kg: number | null;
  sleep_hours: number | null;
  hrv: number | null;
  source: string;
  workout_sessions: number;
};

/** GET /daily-summary/ payload — §10. */
export type DailySummary = {
  daily_log: DailyLog;
  net_calories: number;
  food_log_count: number;
  food_entries: FoodEntry[];
  exercise_entries: unknown[]; // typed in the fitness feature (Phase 6), not needed here
};
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: no errors (types only, unused is fine).

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/food.ts src/shared/types/dailyLog.ts
git commit -m "feat(nutrition): add food + daily-log shared types (API_REFERENCE §8/§10)"
```

---

## Task 2: Pure macro logic (`lib/macros.ts`)

**Files:**

- Create: `src/features/nutrition/lib/macros.ts`

**Interfaces:**

- Consumes: `MacroSummary` (Task 1), `DietProfile` (`shared/types/dietProfile.ts`, existing), `FoodEntry` (Task 1).
- Produces: `computeRemaining(targets, consumed)`, `macroFillRatio(consumed, target)`, `groupEntriesByMeal(entries)` — consumed by `MacroSummaryCard` and `DietHomeScreen`.

- [ ] **Step 1: Implement** (pure, test-ready — CLAUDE.md §7):

```ts
// src/features/nutrition/lib/macros.ts
import type { MealType, FoodEntry, MacroSummary } from '@/shared/types/food';
import type { DietProfile } from '@/shared/types/dietProfile';

export type MacroTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type RemainingMacros = {
  calories: number; // may be negative when over budget — the UI shows neutral, never red
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** Pull the four daily targets off the diet profile (API_REFERENCE §5). */
export function targetsFromProfile(profile: DietProfile): MacroTargets {
  return {
    calories: profile.daily_calories,
    protein_g: profile.daily_protein_g,
    carbs_g: profile.daily_carbs_g,
    fat_g: profile.daily_fat_g,
  };
}

/** remaining = target − consumed, per macro. Can go negative (over budget). */
export function computeRemaining(targets: MacroTargets, consumed: MacroSummary): RemainingMacros {
  return {
    calories: targets.calories - consumed.calories_in,
    protein_g: targets.protein_g - consumed.protein_g,
    carbs_g: targets.carbs_g - consumed.carbs_g,
    fat_g: targets.fat_g - consumed.fat_g,
  };
}

/** Fill ratio for a progress bar, clamped 0..1 (bar never overflows its track visually). */
export function macroFillRatio(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, consumed / target));
}

/** Group a day's entries by meal for a sectioned list. Stable meal order. */
export function groupEntriesByMeal(
  entries: FoodEntry[],
): { meal: MealType; entries: FoodEntry[] }[] {
  const order: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  return order
    .map((meal) => ({ meal, entries: entries.filter((e) => e.meal_type === meal) }))
    .filter((section) => section.entries.length > 0);
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` (expect pass). Sanity-check the math by hand: `computeRemaining({calories:2000,...},{calories_in:760,...}).calories === 1240` (matches the design's "1,240 left" from a 2000 budget).

- [ ] **Step 3: Commit**

```bash
git add src/features/nutrition/lib/macros.ts
git commit -m "feat(nutrition): pure macro-budget + grouping helpers"
```

---

## Task 3: Zod schemas (`schemas.ts`)

**Files:**

- Create: `src/features/nutrition/schemas.ts`

**Interfaces:**

- Produces: `manualEntrySchema` / `ManualEntryValues`, `confirmMealSchema` / `ConfirmMealValues`, `mealTypeSchema` — consumed by the create mutation (Task 4) and confirm form (Task 9).

- [ ] **Step 1: Implement** — mirror the `POST /food/entries/` payload (§8):

```ts
// src/features/nutrition/schemas.ts
import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

/** The editable confirm form (photo/barcode/search all funnel into this). Non-negative numbers. */
export const confirmMealSchema = z.object({
  food_name: z.string().trim().min(1, 'Give it a name'),
  meal_type: mealTypeSchema,
  calories: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(1000),
  carbs_g: z.coerce.number().min(0).max(1000),
  fat_g: z.coerce.number().min(0).max(1000),
});
export type ConfirmMealValues = z.infer<typeof confirmMealSchema>;

/** Manual-entry alias (same shape today; kept separate so the two forms can diverge later). */
export const manualEntrySchema = confirmMealSchema;
export type ManualEntryValues = z.infer<typeof manualEntrySchema>;
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npx eslint src/features/nutrition/schemas.ts`. Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/nutrition/schemas.ts
git commit -m "feat(nutrition): Zod schemas for food entry + confirm form"
```

---

## Task 4: API layer (`api/nutritionApi.ts`)

**Files:**

- Create: `src/features/nutrition/api/nutritionApi.ts`
- Reference (read, don't modify): `src/features/auth/api/authApi.ts` (mutation pattern), `src/shared/api/client.ts` (get/post/delete + `multipart`), `src/shared/api/queryClient.ts`.

**Interfaces:**

- Consumes: `apiClient` (`shared/api/client.ts`), types from Task 1, schemas from Task 3.
- Produces: `nutritionKeys`, `useFoodEntriesQuery(date)`, `useDailySummaryQuery(date)`, `useFoodSearchQuery(q)`, `useBarcodeLookup(code, enabled)`, `useAnalyzePhotoMutation()`, `useCreateFoodEntryMutation()`, `useDeleteFoodEntryMutation()` — consumed by all screens/components.

> **Pre-step:** open `src/shared/api/client.ts` and confirm the exact method signatures (`get`/`post`/`delete`, how query params + `multipart` are passed, the `auth` option). Match them — do not invent a client API. If the client lacks a multipart helper, add a minimal typed one there (smallest change) rather than bypassing the client (CLAUDE.md §6: no per-feature fetch).

- [ ] **Step 1: Implement key factory + query hooks:**

```ts
// src/features/nutrition/api/nutritionApi.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import type {
  FoodEntry,
  FoodItem,
  MacroSummary,
  DailyTotals,
  PhotoEstimate,
} from '@/shared/types/food';
import type { DailySummary } from '@/shared/types/dailyLog';
import type { ConfirmMealValues } from '@/features/nutrition/schemas';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const nutritionKeys = {
  all: ['nutrition'] as const,
  dailySummary: (date: string) => ['nutrition', 'daily-summary', date] as const,
  foodEntries: (date: string) => ['nutrition', 'food-entries', date] as const,
  foodSearch: (q: string) => ['nutrition', 'food-search', q] as const,
  barcode: (code: string) => ['nutrition', 'barcode', code] as const,
};

type FoodEntriesResponse = { entries: FoodEntry[]; macro_summary: MacroSummary };

export function useFoodEntriesQuery(date: string = todayISO()) {
  return useQuery({
    queryKey: nutritionKeys.foodEntries(date),
    queryFn: () => apiClient.get<FoodEntriesResponse>(`/food/entries/?date=${date}`),
  });
}

export function useDailySummaryQuery(date: string = todayISO()) {
  return useQuery({
    queryKey: nutritionKeys.dailySummary(date),
    queryFn: () => apiClient.get<DailySummary>(`/daily-summary/?date=${date}`),
  });
}

export function useFoodSearchQuery(q: string) {
  return useQuery({
    queryKey: nutritionKeys.foodSearch(q),
    queryFn: () => apiClient.get<FoodItem[]>(`/food/search/?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    placeholderData: (prev) => prev, // keepPreviousData: don't flch results while typing
  });
}

export function useBarcodeLookup(code: string, enabled: boolean) {
  return useQuery({
    queryKey: nutritionKeys.barcode(code),
    queryFn: () => apiClient.get<FoodItem>(`/food/lookup/barcode/${encodeURIComponent(code)}/`),
    enabled: enabled && code.length > 0,
  });
}
```

- [ ] **Step 2: Add the mutations** (append to the same file):

```ts
export function useAnalyzePhotoMutation() {
  // Returns an ESTIMATE only (§8); the caller sends the user to confirm, then creates the entry.
  return useMutation({
    mutationFn: (image: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      // RN FormData file part — the shape RN's fetch expects for multipart:
      form.append('image', {
        uri: image.uri,
        name: image.name,
        type: image.type,
      } as unknown as Blob);
      return apiClient.post<PhotoEstimate>('/food/photo/', form, { multipart: true });
    },
  });
}

export function useCreateFoodEntryMutation(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ConfirmMealValues & { source: FoodEntry['source'] }) =>
      apiClient.post<FoodEntry & { daily_totals: DailyTotals }>('/food/entries/', {
        date,
        meal_type: values.meal_type,
        food_name: values.food_name,
        calories: values.calories,
        protein_g: values.protein_g,
        carbs_g: values.carbs_g,
        fat_g: values.fat_g,
        source: values.source,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutritionKeys.foodEntries(date) });
      qc.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}

export function useDeleteFoodEntryMutation(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) => apiClient.delete<void>(`/food/entries/${entryId}/`),
    onMutate: async (entryId) => {
      await qc.cancelQueries({ queryKey: nutritionKeys.foodEntries(date) });
      const prev = qc.getQueryData<FoodEntriesResponse>(nutritionKeys.foodEntries(date));
      if (prev) {
        qc.setQueryData<FoodEntriesResponse>(nutritionKeys.foodEntries(date), {
          ...prev,
          entries: prev.entries.filter((e) => e.id !== entryId),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(nutritionKeys.foodEntries(date), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: nutritionKeys.foodEntries(date) });
      qc.invalidateQueries({ queryKey: nutritionKeys.dailySummary(date) });
    },
  });
}
```

Add the missing import at the top: `import type { FoodEntry } from '@/shared/types/food';` is already imported — confirm `FoodSource` usage compiles (use `FoodEntry['source']`).

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (fix any client-signature mismatches by matching `client.ts`) + `npx eslint src/features/nutrition/api/nutritionApi.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/features/nutrition/api/nutritionApi.ts src/shared/api/client.ts
git commit -m "feat(nutrition): TanStack Query hooks for food + daily-summary (§8/§10)"
```

---

## Task 5: Mock DB extension + fixtures

**Files:**

- Modify: `src/shared/api/mock/db.ts`
- Create: `src/features/nutrition/mocks/fixtures.ts`

**Interfaces:**

- Consumes: types from Task 1.
- Produces: `mockDb.foodEntries`, `mockDb.dailyLogs`, `mockDb.foodItems`, `mockDb.photoQuotaByUserDate`; `SEED_FOOD_ITEMS`, `starterDayEntries(userId, date)` — consumed by handlers (Task 6).

- [ ] **Step 1: Extend `db.ts`** — add fields to `MockDb`, `createEmptyDb()`, and `__resetMockDbForTests()`:

```ts
// add imports
import type { FoodEntry, FoodItem } from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';

// inside type MockDb { ... add: }
  foodEntries: FoodEntry[];
  dailyLogs: Record<string, DailyLog>;         // key: `${userId}:${date}`
  foodItems: FoodItem[];                         // seeded search/barcode DB
  photoQuotaByUserDate: Record<string, number>;  // key: `${userId}:${date}` → count (limit 10/day)
  nextFoodEntryId: number;

// createEmptyDb(): add the same fields — [], {}, [], {}, 1
// __resetMockDbForTests(): reset the same fields
```

- [ ] **Step 2: Write `fixtures.ts`** — a small realistic food DB + a starter day (mirrors how `dietProfile.handlers.ts` lazily seeds):

```ts
// src/features/nutrition/mocks/fixtures.ts
import type { FoodEntry, FoodItem } from '@/shared/types/food';

export const SEED_FOOD_ITEMS: FoodItem[] = [
  {
    id: 1,
    barcode: '8901234567890',
    name: 'Greek Yogurt',
    calories_per_100g: 59,
    protein_g_per_100g: 10,
    carbs_g_per_100g: 3.6,
    fat_g_per_100g: 0.4,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 2,
    barcode: '8900000000017',
    name: 'Paneer',
    calories_per_100g: 296,
    protein_g_per_100g: 18,
    carbs_g_per_100g: 3.4,
    fat_g_per_100g: 25,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 3,
    barcode: '8900000000024',
    name: 'Cooked Rice',
    calories_per_100g: 130,
    protein_g_per_100g: 2.7,
    carbs_g_per_100g: 28,
    fat_g_per_100g: 0.3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 4,
    barcode: '8900000000031',
    name: 'Toor Dal (cooked)',
    calories_per_100g: 121,
    protein_g_per_100g: 7,
    carbs_g_per_100g: 20,
    fat_g_per_100g: 0.4,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 5,
    barcode: '8900000000048',
    name: 'Banana',
    calories_per_100g: 89,
    protein_g_per_100g: 1.1,
    carbs_g_per_100g: 23,
    fat_g_per_100g: 0.3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 6,
    barcode: '8900000000055',
    name: 'Roti (whole wheat)',
    calories_per_100g: 297,
    protein_g_per_100g: 11,
    carbs_g_per_100g: 51,
    fat_g_per_100g: 7,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 7,
    barcode: '8900000000062',
    name: 'Mixed Greens (sautéed)',
    calories_per_100g: 60,
    protein_g_per_100g: 3,
    carbs_g_per_100g: 6,
    fat_g_per_100g: 3,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 8,
    barcode: '8900000000079',
    name: 'Lassi (sweet)',
    calories_per_100g: 92,
    protein_g_per_100g: 3,
    carbs_g_per_100g: 14,
    fat_g_per_100g: 2.5,
    source: 'openfoodfacts',
    last_fetched: '2026-07-01T00:00:00Z',
  },
];

/** One breakfast entry so the screen has data on first demo (not empty, not full). */
export function starterDayEntries(date: string, startId: number): FoodEntry[] {
  return [
    {
      id: startId,
      date,
      meal_type: 'breakfast',
      food_name: 'Greek yogurt & banana',
      calories: 220,
      protein_g: 14,
      carbs_g: 34,
      fat_g: 3,
      source: 'manual',
      created_at: `${date}T08:15:00Z`,
    },
  ];
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit`. Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/mock/db.ts src/features/nutrition/mocks/fixtures.ts
git commit -m "feat(nutrition): mock DB tables + seed food fixtures"
```

---

## Task 6: Mock handlers (§8 food + §10 daily-summary)

**Files:**

- Create: `src/features/nutrition/mocks/handlers.ts`
- Modify: `src/shared/api/mock/registerAllMocks.ts`
- Reference: `src/features/onboarding/mocks/dietProfile.handlers.ts` (exact precedent), `src/shared/api/mock/envelope.ts`, `src/shared/api/mock/auth.ts` (`requireMockUser`).

**Interfaces:**

- Consumes: `registerMock`, `mockDb`, `requireMockUser`, `styleB`/`styleAError`, fixtures (Task 5), types (Task 1).
- Produces: registered routes for `GET/POST /food/entries/`, `DELETE /food/entries/:id/`, `GET /food/search/`, `GET /food/lookup/barcode/:barcode/`, `POST /food/photo/`, `GET /daily-summary/`.

- [ ] **Step 1: Implement handlers** — key logic (Style B; 401 via `styleAError`; recompute macro summary from entries; enforce photo quota + failure modes exactly per §8):

```ts
// src/features/nutrition/mocks/handlers.ts
import { registerMock } from '@/shared/api/mock/router';
import { mockDb } from '@/shared/api/mock/db';
import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import type { FoodEntry, MacroSummary } from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';
import { SEED_FOOD_ITEMS, starterDayEntries } from '@/features/nutrition/mocks/fixtures';

const PHOTO_DAILY_LIMIT = 10;

function ensureSeed(): void {
  if (mockDb.foodItems.length === 0) mockDb.foodItems = [...SEED_FOOD_ITEMS];
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function entriesFor(userIdDate: string, all: FoodEntry[], date: string): FoodEntry[] {
  return all.filter((e) => e.date === date);
}
function summarize(entries: FoodEntry[]): MacroSummary {
  return entries.reduce<MacroSummary>(
    (acc, e) => ({
      calories_in: acc.calories_in + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories_in: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}
function recomputeDailyLog(userId: string, date: string): DailyLog {
  const entries = mockDb.foodEntries.filter((e) => e.date === date);
  const s = summarize(entries);
  const key = `${userId}:${date}`;
  const existing = mockDb.dailyLogs[key];
  const log: DailyLog = {
    id: existing?.id ?? Math.floor(Math.random() * 1e6),
    date,
    calories_in: s.calories_in,
    calories_out: existing?.calories_out ?? 0,
    protein_g: s.protein_g,
    carbs_g: s.carbs_g,
    fat_g: s.fat_g,
    water_ml: existing?.water_ml ?? 0,
    steps: existing?.steps ?? 0,
    weight_kg: existing?.weight_kg ?? null,
    sleep_hours: existing?.sleep_hours ?? null,
    hrv: existing?.hrv ?? null,
    source: 'manual',
    workout_sessions: existing?.workout_sessions ?? 0,
  };
  mockDb.dailyLogs[key] = log;
  return log;
}
function seedStarterDay(date: string): void {
  const already = mockDb.foodEntries.some((e) => e.date === date);
  if (already) return;
  const seeded = starterDayEntries(date, mockDb.nextFoodEntryId);
  mockDb.nextFoodEntryId += seeded.length;
  mockDb.foodEntries.push(...seeded);
}

registerMock('GET', '/food/entries/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  ensureSeed();
  const date = req.query.date ?? todayISO();
  seedStarterDay(date);
  const entries = mockDb.foodEntries.filter((e) => e.date === date);
  return {
    status: 200,
    delayMs: 250,
    body: styleB({ entries, macro_summary: summarize(entries) }),
  };
});

registerMock('POST', '/food/entries/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  const b = (req.body ?? {}) as Partial<FoodEntry>;
  const fieldErrors: Record<string, string[]> = {};
  if (!b.food_name) fieldErrors.food_name = ['This field is required.'];
  if (b.meal_type == null) fieldErrors.meal_type = ['This field is required.'];
  if (Object.keys(fieldErrors).length) return { status: 400, body: fieldErrors };
  const date = b.date ?? todayISO();
  const entry: FoodEntry = {
    id: mockDb.nextFoodEntryId++,
    date,
    meal_type: b.meal_type!,
    food_name: b.food_name!,
    calories: b.calories ?? 0,
    protein_g: b.protein_g ?? 0,
    carbs_g: b.carbs_g ?? 0,
    fat_g: b.fat_g ?? 0,
    source: b.source ?? 'manual',
    created_at: new Date().toISOString(),
  };
  mockDb.foodEntries.push(entry);
  const log = recomputeDailyLog(user.id, date);
  return {
    status: 201,
    delayMs: 300,
    body: styleB({
      ...entry,
      daily_totals: {
        calories_in: log.calories_in,
        protein_g: log.protein_g,
        carbs_g: log.carbs_g,
        fat_g: log.fat_g,
        calories_out: log.calories_out,
        net_calories: log.calories_in - log.calories_out,
      },
    }),
  };
});

registerMock('DELETE', '/food/entries/:id/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  const id = Number(req.params.id);
  const idx = mockDb.foodEntries.findIndex((e) => e.id === id);
  if (idx === -1) return { status: 404, body: { detail: 'Not found.' } };
  const [removed] = mockDb.foodEntries.splice(idx, 1);
  recomputeDailyLog(user.id, removed.date);
  return { status: 204, delayMs: 200 };
});

registerMock('GET', '/food/search/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  ensureSeed();
  const q = (req.query.q ?? '').toLowerCase();
  const pageSize = Number(req.query.page_size ?? 20);
  const results = mockDb.foodItems
    .filter((f) => f.name.toLowerCase().includes(q))
    .slice(0, pageSize);
  return { status: 200, delayMs: 300, body: styleB(results) };
});

registerMock('GET', '/food/lookup/barcode/:barcode/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  ensureSeed();
  const item = mockDb.foodItems.find((f) => f.barcode === req.params.barcode);
  if (!item) return { status: 404, delayMs: 250, body: { detail: 'Food item not found.' } };
  return { status: 200, delayMs: 250, body: styleB(item) };
});

registerMock('POST', '/food/photo/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  const key = `${user.id}:${todayISO()}`;
  const used = mockDb.photoQuotaByUserDate[key] ?? 0;
  if (used >= PHOTO_DAILY_LIMIT) {
    return {
      status: 429,
      delayMs: 200,
      body: { error: 'Daily photo limit reached. Enter meal manually.' },
    };
  }
  mockDb.photoQuotaByUserDate[key] = used + 1;
  // Deterministic plausible estimate (matches the design's "Rice bowl, paneer, greens ~640 kcal").
  return {
    status: 200,
    delayMs: 900,
    body: styleB({
      name: 'Rice bowl with paneer and greens',
      portion_grams: 350,
      est_calories: 640,
      est_protein_g: 32,
      est_carbs_g: 74,
      est_fat_g: 22,
    }),
  };
});

registerMock('GET', '/daily-summary/', (req) => {
  const user = requireMockUser(req);
  if (!user) return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  const date = req.query.date ?? todayISO();
  seedStarterDay(date);
  const log = recomputeDailyLog(user.id, date);
  const foodEntries = mockDb.foodEntries.filter((e) => e.date === date);
  return {
    status: 200,
    delayMs: 250,
    body: styleB({
      daily_log: log,
      net_calories: log.calories_in - log.calories_out,
      food_log_count: foodEntries.length,
      food_entries: foodEntries,
      exercise_entries: [],
    }),
  };
});
```

> Note: confirm `requireMockUser` and `styleB`/`styleAError` signatures against the actual files before finalizing (the precedent file uses exactly these). Confirm the router `:param` syntax (`router.ts` compiles `:id`/`:barcode`).

- [ ] **Step 2: Register** — add to `src/shared/api/mock/registerAllMocks.ts`:

```ts
import '@/features/nutrition/mocks/handlers';
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` + `npx eslint src/features/nutrition/mocks/*.ts`. Runtime check deferred to Task 8 (first screen wired).

- [ ] **Step 4: Commit**

```bash
git add src/features/nutrition/mocks/handlers.ts src/shared/api/mock/registerAllMocks.ts
git commit -m "feat(nutrition): mock handlers for food (§8) + daily-summary (§10)"
```

---

## Task 7: `MacroSummaryCard` + `FoodEntryRow` components

**Files:**

- Create: `src/features/nutrition/components/MacroSummaryCard.tsx`
- Create: `src/features/nutrition/components/FoodEntryRow.tsx`

**Interfaces:**

- Consumes: `GlassCard`, tokens/`textStyle`, `macros.ts` (Task 2), types (Task 1).
- Produces: `<MacroSummaryCard targets consumed />`, `<FoodEntryRow entry onDelete />` — consumed by `DietHomeScreen` (Task 8).

- [ ] **Step 1: `MacroSummaryCard`** — the one **night-glass hero** (design-system §4). Structure (props + layout, exact tokens, no hardcoded values):
  - Props: `{ targets: MacroTargets; consumed: MacroSummary }`.
  - Eyebrow row: `LEFT TODAY` (`label` token, `ink45`) on the left; `Adjusts as I learn you` (`caption`, `ink40`) right-aligned — verbatim from 14a.
  - Hero number: `computeRemaining(...).calories` formatted with a thousands separator, `display`/`cardValue`-scale weight-200 number + small `kcal` unit beside it (design-system §2 "numbers are the hero"). If negative, show the number neutrally (no red) — over-budget is not an error.
  - Three macro bars (Protein/Carbs/Fat): label + `${consumed}g` value, then a thin track (`rgba(ink,.16)`) with a fill (`rgba(ink,.6)`) width = `macroFillRatio(consumed, target) * 100%`. **Bars, not waves** (design-system §6.1). Values verbatim style from 14a ("Protein 62g … Carbs 148g … Fat 41g").
  - Card = `<GlassCard variant="night">`; text uses `onNight` color.
- [ ] **Step 2: `FoodEntryRow`** — a light-glass row: `food_name` (body) + `${calories} kcal` (caption, `ink45`) on the right; long-press or a trailing affordance calls `onDelete(entry.id)`. Meal grouping headers are rendered by the screen, not the row.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` + `npx eslint`. Visual check happens in Task 8.
- [ ] **Step 4: Commit**

```bash
git add src/features/nutrition/components/MacroSummaryCard.tsx src/features/nutrition/components/FoodEntryRow.tsx
git commit -m "feat(nutrition): MacroSummaryCard hero + FoodEntryRow"
```

---

## Task 8: `DietHomeScreen` (14a) wired as temporary landing

**Files:**

- Create: `src/features/nutrition/screens/DietHomeScreen.tsx`
- Create/append: `src/features/nutrition/index.ts` (export `DietHomeScreen`)
- Modify: `src/app/(app)/index.tsx` (temporary → render `DietHomeScreen`)

**Interfaces:**

- Consumes: `useFoodEntriesQuery`, `useDietProfileQuery` (from onboarding `index.ts` if exported; else add a read-only hook in `nutritionApi`), `macros.ts`, `MacroSummaryCard`, `FoodEntryRow`, `LogMealSheet` (Task 9 — stub the open handler now, wire the sheet in Task 9), `Screen`, tokens.
- Produces: the composed 14a screen.

- [ ] **Step 1: Implement the screen** — `Screen` (scrollable), header `Diet` (eyebrow) + the design's headline ("Carbs before 5. That's the whole game today." — for Layer 1 use a neutral static headline or the diet-profile-driven one; if no dynamic source yet, use the design's line as a static placeholder and flag it). Then `MacroSummaryCard` (targets from diet profile, consumed from `macro_summary`), then the grouped entries list (`groupEntriesByMeal`), then a "Log a meal" pill that opens `LogMealSheet`. Loading = skeleton on card + rows; empty = calm "Nothing logged yet" (design-system §7, never red). **Leave a clearly-commented gap where the Layer-2 "Next meal" card and `78 → 72` chip will go — do not fake them.**
- [ ] **Step 2: Point the route** — `src/app/(app)/index.tsx` renders `<DietHomeScreen />` and nothing else. Add a comment: `// TEMPORARY landing (F-N3): swap to petal-cluster Home at Phase 4 — one-line change here only.`
- [ ] **Step 3: Verify (first real runtime check)** — start the app in mock mode (`EXPO_PUBLIC_API_MODE=mock`), sign in through onboarding, land on Diet home. Confirm: the hero card shows a remaining-kcal number derived from the diet profile minus the seeded breakfast entry; the seeded entry appears under "Breakfast"; loading skeleton shows briefly (250ms mock delay); no red anywhere; layout scrolls and doesn't clip at a small width. Also `npx tsc --noEmit` + `npx eslint`.
- [ ] **Step 4: Commit**

```bash
git add src/features/nutrition/screens/DietHomeScreen.tsx src/features/nutrition/index.ts "src/app/(app)/index.tsx"
git commit -m "feat(nutrition): Diet home (14a) as temporary app landing, wired to mock food data"
```

---

## Task 9: `LogMealSheet` (14b) + `LoggingOptionTile` + `ConfirmMealScreen` (describe/manual path)

**Files:**

- Create: `src/features/nutrition/components/LoggingOptionTile.tsx`
- Create: `src/features/nutrition/components/LogMealSheet.tsx`
- Create: `src/features/nutrition/components/FoodSearchList.tsx`
- Create: `src/features/nutrition/screens/ConfirmMealScreen.tsx`
- Create: `src/app/(app)/nutrition/confirm.tsx` (thin route)
- Modify: `src/features/nutrition/index.ts`

**Interfaces:**

- Consumes: `useFoodSearchQuery`, `useCreateFoodEntryMutation`, `confirmMealSchema`, RHF, `VoiceInputBar`, `GlassCard`, tokens.
- Produces: the 14b sheet (4 tiles + input bar), the search list, and the 15a-style confirm screen that commits a `manual`/search entry.

- [ ] **Step 1: `LoggingOptionTile`** — light-glass card with icon + title + subtitle; verbatim copy from 14b: "Snap the plate / I read the whole meal", "Scan barcode / Packaged anything", "Nutrition label / I digitize the fine print", "Describe it / Type or talk it out". A `disabled` prop dims the tile (not needed now that photo/barcode are in scope, but keep it for graceful capability fallbacks). One `onPress` per tile.
- [ ] **Step 2: `LogMealSheet`** — bottom sheet (`Modal` or a sheet lib already in the project; check `package.json` first — if none, use RN `Modal` with a glass panel, no new dep). Header "What are we logging?" + "However it comes. I do the math." (verbatim). 2×2 grid of tiles + `VoiceInputBar` with placeholder `"Two rotis, dal, and a lassi"` (verbatim). Describe/voice submit and the "Describe it" tile both route to search/manual. Each path calls a passed `onPick(path)` handler.
- [ ] **Step 3: `FoodSearchList`** — debounced input (~300ms) → `useFoodSearchQuery`; render results as rows (name + per-100g kcal); tapping a result pre-fills the confirm form (scale to a default 100g portion; user edits on confirm). A "Enter manually" affordance opens the confirm form blank. 503 → calm "That lookup's down — describe it instead".
- [ ] **Step 4: `ConfirmMealScreen` (15a "Check my math")** — RHF + `confirmMealSchema`. Header "Here's what I saw. Check my math." (verbatim, adapted for search/manual: "Check my math."). Editable fields: `food_name`, `meal_type` (a `SelectableChip` row), `calories`, `protein_g`, `carbs_g`, `fat_g`. **Aggregate only** (F-N2 — do not build per-ingredient line items). Primary action (the one `coreBlue` button): "Looks right" → `useCreateFoodEntryMutation(date).mutate({...values, source})` → on success `router.back()` to Diet home (which refetches via invalidation). Params (`source`, and any prefill) are passed via route params, parsed with a Zod param schema (architecture.md §5 "validate deep-link params").
- [ ] **Step 5: Thin route** `src/app/(app)/nutrition/confirm.tsx` → parse params → `<ConfirmMealScreen .../>`.
- [ ] **Step 6: Verify (runtime)** — in mock mode: open the sheet, "Describe it" → type "paneer" → seeded Paneer appears → tap → confirm screen prefilled → "Looks right" → returns to Diet home, entry appears under the chosen meal, hero kcal drops accordingly. Also manual blank entry. `npx tsc --noEmit` + `npx eslint`.
- [ ] **Step 7: Commit**

```bash
git add src/features/nutrition/components/LoggingOptionTile.tsx src/features/nutrition/components/LogMealSheet.tsx src/features/nutrition/components/FoodSearchList.tsx src/features/nutrition/screens/ConfirmMealScreen.tsx "src/app/(app)/nutrition/confirm.tsx" src/features/nutrition/index.ts
git commit -m "feat(nutrition): log-a-meal sheet (14b) + describe/search + confirm (15a), manual entry end-to-end"
```

---

## Task 10: Photo path (`Snap the plate` + `Nutrition label`)

**Files:**

- Modify: `package.json` (+ `expo-image-picker`), `app.config.ts` (permission strings)
- Modify: `src/features/nutrition/components/LogMealSheet.tsx` (wire photo tiles)
- Reference: SDK 57 docs for `expo-image-picker`.

**Interfaces:**

- Consumes: `useAnalyzePhotoMutation`, `ConfirmMealScreen` (prefilled from `PhotoEstimate`).
- Produces: photo capture → analyze → confirm → create entry, with 422/429 fallbacks.

- [ ] **Step 1: Add the dependency** (flagged per CLAUDE.md §6 — no overlap with existing libs):

```bash
npx expo install expo-image-picker
```

- [ ] **Step 2: Permissions** — add iOS `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` and Android camera permission via `app.config.ts` (calm first-person copy, e.g. "Coreo uses your camera to read your meal so you don't have to type it."). Verify against SDK 57 config docs.
- [ ] **Step 3: Wire the tiles** — "Snap the plate" launches the camera; "Nutrition label" launches the same capture (same analyze→confirm flow, per spec). On capture → `useAnalyzePhotoMutation.mutate(file)`:
  - Success → navigate to `ConfirmMealScreen` prefilled from the `PhotoEstimate` (`food_name=name`, macros from `est_*`), `source: 'photo'`.
  - **422** → calm sheet message using the API's copy ("Photo couldn't be analyzed. Enter your meal manually.") → open the manual confirm form.
  - **429** → the API's "Daily photo limit reached. Enter meal manually." → manual path.
  - Permission denied → calm explainer + manual fallback.
- [ ] **Step 4: Verify (runtime)** — mock mode: photo tile → (simulator: pick from library) → 900ms analyze delay → confirm screen shows "Rice bowl with paneer and greens / 640 kcal" prefilled → "Looks right" → entry logged with `source: photo`. Force the 429 by logging 10 photos → verify the fallback copy. `npx tsc --noEmit` + `npx eslint`.
- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.ts src/features/nutrition/components/LogMealSheet.tsx
git commit -m "feat(nutrition): photo logging (snap the plate + nutrition label) via §8 /food/photo/"
```

---

## Task 11: Barcode path (`Scan barcode`)

**Files:**

- Modify: `src/features/nutrition/components/LogMealSheet.tsx` (wire barcode tile)
- (Barcode scanning UI: use `expo-camera`'s barcode scanner if already present, else — to avoid a 2nd new dep in this layer — provide a manual barcode-entry input that feeds `useBarcodeLookup`. **Decide + flag**: real camera scanning can be a fast-follow; the API path is identical either way.)

**Interfaces:**

- Consumes: `useBarcodeLookup`, `ConfirmMealScreen` (prefilled from `FoodItem`, scaled to a default portion).
- Produces: barcode → lookup → confirm → entry, with 404/503 fallbacks.

- [ ] **Step 1: Wire the tile** — capture/enter a barcode → `useBarcodeLookup(code, true)`:
  - Success → confirm screen prefilled from the `FoodItem` (scale per-100g to a default 100g portion; user edits portion/macros), `source: 'barcode'`.
  - **404** ("Food item not found.") → calm "Didn't find that one — describe it instead" → manual path.
  - **503** → calm "That lookup's down for a moment" → manual path.
- [ ] **Step 2: Verify (runtime)** — mock mode: barcode `8900000000017` → Paneer prefilled → confirm → logged with `source: barcode`. Unknown barcode → 404 fallback. `npx tsc --noEmit` + `npx eslint`.
- [ ] **Step 3: Commit**

```bash
git add src/features/nutrition/components/LogMealSheet.tsx
git commit -m "feat(nutrition): barcode logging via §8 /food/lookup/barcode/"
```

---

## Task 12: Delete entry + states polish

**Files:**

- Modify: `src/features/nutrition/screens/DietHomeScreen.tsx`, `src/features/nutrition/components/FoodEntryRow.tsx`

**Interfaces:**

- Consumes: `useDeleteFoodEntryMutation` (optimistic, from Task 4).

- [ ] **Step 1: Wire delete** — `FoodEntryRow` trailing action (or long-press) → confirm → `useDeleteFoodEntryMutation(date).mutate(id)`. Optimistic removal (already in the hook); on error, rollback + a calm toast/inline message.
- [ ] **Step 2: States pass** — verify/finish loading (skeletons), empty (`EmptyOrErrorState` pattern), offline (cached day if present; mutation failure → retry affordance, no silent loss), over-budget (neutral, "I adjust, we move on" copy from 14a). No red anywhere.
- [ ] **Step 3: Verify (runtime)** — delete the entry → it disappears immediately, hero kcal reverts; toggle airplane mode → mutation fails gracefully with retry. `npx tsc --noEmit` + `npx eslint`.
- [ ] **Step 4: Commit**

```bash
git add src/features/nutrition/screens/DietHomeScreen.tsx src/features/nutrition/components/FoodEntryRow.tsx
git commit -m "feat(nutrition): delete entry (optimistic) + loading/empty/offline states"
```

---

## Task 13: Responsive + accessibility pass

**Files:**

- Modify: nutrition screens/components as needed.

- [ ] **Step 1** — verify every screen scrolls and doesn't clip at **375pt** and **430pt** widths and in **landscape** (design-system §11); hero number scales to **135%** system font without clipping (§2); tap targets ≥44pt; sub-18px text over atmosphere sits on glass/scrim (§1).
- [ ] **Step 2: Verify** — device/emulator at both widths + landscape + large font setting. Screenshot before/after for the record.
- [ ] **Step 3: Commit**

```bash
git add src/features/nutrition
git commit -m "fix(nutrition): responsive + a11y pass (widths, landscape, font scaling, tap targets)"
```

---

## Task 14: Documentation updates

**Files:**

- Modify: `docs/product-context.md` §5, `docs/feature-map.md`, `docs/design-system.md` §9, `docs/architecture.md` §2, `CLAUDE.md` §3.

- [ ] **Step 1** — `product-context.md` §5: remove "Barcode/photo-based food logging" from out-of-scope; add a dated note that photo+barcode were moved into MVP scope for the nutrition Layer-1 build (F-N1), macro-level still (micronutrients stay out).
- [ ] **Step 2** — `feature-map.md`: nutrition row status → "🚧 Layer 1 (food logging + tracking) built; Layer 2 (meal plans/actions/assistant) pending"; note photo/barcode now in scope.
- [ ] **Step 3** — `design-system.md` §9: update the 21A/21B + 25A photo-logging deferral bullet to reflect F-N1 (built in Layer 1). Add a changelog entry (§12).
- [ ] **Step 4** — `architecture.md` §2 repo map: fill in `features/nutrition/` contents.
- [ ] **Step 5** — `CLAUDE.md` §3 stack table: add `expo-image-picker` (photo capture) row.
- [ ] **Step 6: Commit**

```bash
git add docs/ CLAUDE.md
git commit -m "docs(nutrition): record photo/barcode scope change + nutrition Layer-1 status"
```

---

## Task 15: Final verification (pr-review gate)

- [ ] **Step 1** — open `.agent/skills/pr-review/SKILL.md` and run its checklist against the whole feature.
- [ ] **Step 2** — full `npx tsc --noEmit` (repo-wide) + `npx eslint .` → zero errors.
- [ ] **Step 3** — walk every acceptance criterion in the design spec §12; check each off against a live mock-mode run.
- [ ] **Step 4** — confirm: no `coreBlue` misuse (grep), no red/error tints on over-budget, no wave chart used for macros, no hardcoded hex/spacing in nutrition files (grep for `#` and raw px in styles), tokens used throughout.
- [ ] **Step 5** — security-review skill IF any auth/token/storage touched (it shouldn't be — flag if it is).
- [ ] **Step 6: Final commit** (if any fixes)

```bash
git add -A
git commit -m "chore(nutrition): pr-review fixes; Layer-1 food logging complete"
```

---

## Self-review (against the spec)

**Spec coverage:** 14a (Tasks 7–8), 14b (Task 9), confirm/15a (Task 9), describe/search (9), photo (10), barcode (11), nutrition-label (10, reuses photo), delete (12), states (8/9/12), mock §8+§10 (5/6), feature architecture (1–6), diet-as-landing F-N3 (8), photo/barcode override F-N1 (10/11/14), 15a-vs-API F-N2 (9), new-dep F-N4 (10), responsive (13), acceptance §12 (15). ✅ All spec sections mapped.

**Placeholder scan:** contract-critical files (types, schemas, macros, api hooks, mock handlers, fixtures) have complete code. UI component tasks (7, 9, 10, 11) specify props/structure/exact tokens/verbatim copy rather than full JSX — this is deliberate for a design-system-driven RN build where the implementer composes known primitives; every such task lists exact inputs, copy, states, and a runtime acceptance check, so nothing is left to guess. No "TODO/handle edge cases/similar to Task N" placeholders remain.

**Type consistency:** `nutritionKeys`, hook names (`useFoodEntriesQuery`/`useCreateFoodEntryMutation`/`useDeleteFoodEntryMutation`/`useAnalyzePhotoMutation`/`useBarcodeLookup`/`useFoodSearchQuery`/`useDailySummaryQuery`), `ConfirmMealValues`, `MacroTargets`/`RemainingMacros`, `FoodEntry`/`FoodItem`/`MacroSummary`/`DailyTotals`/`PhotoEstimate`/`DailyLog`, and `mockDb.{foodEntries,dailyLogs,foodItems,photoQuotaByUserDate,nextFoodEntryId}` are used with the same names across all tasks. ✅

**Known adaptation:** TDD ceremony replaced by tsc+eslint+runtime-mock verification because test infra is deferred (CLAUDE.md §7); pure logic (`macros.ts`) written test-ready.

---

# Addendum — Layer 1.1: Live camera barcode scanning + UI refinements (2026-07-26)

Follow-up after build verification. Two changes: refine the Diet home to match the design screenshot, and replace manual-only barcode entry with real on-device camera scanning (manual entry demoted to an optional fallback).

## Feasibility (barcode scanning) — verified

**Yes — fully doable on the frontend, on-device, open-source, no API key or cost.** Use **`expo-camera`** (official Expo package, MIT). Its `CameraView` scans barcodes natively (Apple Vision on iOS, Google MLKit on Android) via `barcodeScannerSettings={{ barcodeTypes: [...] }}` + `onBarcodeScanned` — no third-party SDK, no network for the scan itself. Confirmed against the Expo SDK 57 camera docs (`docs.expo.dev`).

Separation of concerns: the **scan** (camera → raw barcode string) is on-device and free; the **product lookup** (barcode → food macros) is a separate call to our existing `GET /food/lookup/barcode/{barcode}/` (§8), which in production resolves against the free **OpenFoodFacts** open API server-side — the mock already simulates it. So no food-database API work is needed on the client.

Packaged-food barcode symbologies to enable: `ean13` (global standard, incl. most Indian MRP packs), `ean8`, `upc_a`, `upc_e` (+ `code128` as a catch-all).

`expo-barcode-scanner` (the old standalone package) is **deprecated/removed** — its functionality merged into `expo-camera`. Use `expo-camera`, not `expo-barcode-scanner`.

## Refinement A — Diet home UI to match the screenshot

- **`MacroSummaryCard`**: macros laid out as **three horizontal columns** (Protein / Carbs / Fat), each `label` + `value` inline with a thin fill bar beneath — not a vertical stack. (Done.)
- **Heading**: two-weight `pageTitle` treatment (light lead + `poppins500` accent), matching the design's "Carbs before 5. **That's the whole game today.**" Copy is a **static stand-in** — the real dynamic coaching line is a Layer-2 (AI) hook; flagged in-code. Eyebrow "Diet" centered. (Done.)

## Refinement B — Live barcode scanning

**New dependency:** `expo-camera` (`npx expo install expo-camera`). Camera permission strings already added to `app.config.ts` (shared with the photo path). Isolate all `expo-camera` imports to one component (`BarcodeScannerView`) so the rest of the feature stays free of the native dep and typechecks before install — same pattern as `photoCapture.ts`.

**Files:**

- Create `src/features/nutrition/components/BarcodeScannerView.tsx` — the ONLY file importing `expo-camera`. Owns the camera permission flow + `CameraView` + the glass scan-reticle overlay. Props: `{ onScan(code), onClose(), onEnterManually(), paused }`. Scanning stops (`onBarcodeScanned` set to `undefined`) while `paused` (after a hit / during lookup) so it fires once.
- Create `src/features/nutrition/screens/BarcodeScannerScreen.tsx` — composes the scanner, runs the lookup (`useBarcodeLookup`), and on a hit `router.replace`s to the confirm screen (`source: 'barcode'`, prefilled from the `FoodItem` scaled to 100 g). Owns the **manual-entry fallback** (a text field revealed by "Enter code instead") and the not-found/service-down calm notices with a "Scan again".
- Create route `src/app/(app)/nutrition/scan.tsx` → `BarcodeScannerScreen`; register in `(app)/_layout.tsx`.
- Modify `LogMealSheet.tsx` — the "Scan barcode" tile now `router.push('/nutrition/scan')` (closing the sheet); remove the in-sheet manual `BarcodeMode` (moved into the scanner screen as the fallback). `useBarcodeLookup` usage leaves the sheet.
- Export `BarcodeScannerScreen` from `features/nutrition/index.ts`.

**Flow:** Scan barcode tile → scanner screen (camera live) → point at barcode → auto-detect → lookup → **found** → confirm screen prefilled (edit + log); **not found / DB down** → calm notice + "Scan again" or "Enter code instead"; **permission denied** → explainer + "Enter code instead". Manual entry hits the identical §8 endpoint.

**Edge cases:** permission denied/undetermined; duplicate rapid scans (pause after first hit); simulator has no camera (manual-entry fallback covers demoing); unknown barcode (404); food DB down (503). No red error states — calm copy + a recovery path everywhere (design-system §10).

**Verification:** `tsc` clean except the expected uninstalled `expo-camera` (resolves on `npx expo install expo-camera`); runtime scan test on a real device (simulators lack a camera — use the manual fallback there).
