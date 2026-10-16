/**
 * Mock backend for the nutrition pillar — food tracking (API_REFERENCE.md §8) + daily summary
 * (§10). Bare payloads (Style B) via `styleB`; framework-level 401 uses Style A `styleAError` per
 * §2's "framework errors always use Style A" rule (same precedent as
 * `features/onboarding/mocks/dietProfile.handlers.ts`). Registered once at import time via
 * `registerAllMocks.ts`. Small `delayMs` on each route so loading states are exercised for real.
 */

import { registerMock } from '@/shared/api/mock/router';
import { mockDb } from '@/shared/api/mock/db';
import { requireMockUser } from '@/shared/api/mock/auth';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import type {
  FoodEntriesMacroSummary,
  FoodEntry,
  FoodItem,
  MacroBudgetEntry,
  MacroSummary,
} from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';
import { SEED_FOOD_ITEMS, WEEKLY_DIET_REVIEW_FIXTURE } from '@/features/nutrition/mocks/fixtures';
import { mealTypeSchema } from '@/features/nutrition/schemas';

const PHOTO_DAILY_LIMIT = 10; // free tier — API_REFERENCE.md §8/§16
const LABEL_DAILY_LIMIT = 10; // independent backend quota — views.py label_ocr

const UNAUTHORIZED = {
  status: 401 as const,
  body: styleAError('UNAUTHORIZED', 'Authentication required.'),
};

const USUALS_BY_MEAL = {
  breakfast: ['Oats and fruit', 'Eggs and toast', 'Protein shake'],
  lunch: ['Rice bowl, paneer', 'Dal, roti, salad', 'Protein shake'],
  dinner: ['Dal, roti, salad', 'Rice bowl, paneer', 'Protein shake'],
  snack: ['Protein shake', 'Fruit and yoghurt', 'Nuts and fruit'],
} as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function validISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function ensureFoodDbSeeded(): void {
  if (mockDb.foodItems.length === 0) mockDb.foodItems = [...SEED_FOOD_ITEMS];
}

function ensureWeeklyDietReviewSeeded(userId: string): void {
  if (mockDb.weeklyDietReviews[userId] === undefined) {
    mockDb.weeklyDietReviews[userId] = [{ ...WEEKLY_DIET_REVIEW_FIXTURE }];
  }
}

// EAN-8/UPC-A/EAN-13/ITF-14 are the digit-length formats `BarcodeScannerView`'s
// `barcodeScannerSettings` actually decodes (ean13/ean8/upc_a/upc_e/code128) — real packaging in
// the room will almost never match one of the ~10 fake seeded codes in fixtures.ts, so treating
// "well-formed but unseeded" the same as "garbage input" made on-device testing with real products
// dead-end at a 404 every time.
const WELL_FORMED_BARCODE = /^\d{6,14}$/;

/** Cheap, deterministic string hash — used only to make the generic fallback item look different
 * per barcode (stable across repeat scans of the same product) without needing real math. */
function hashBarcode(barcode: string): number {
  let hash = 0;
  for (let i = 0; i < barcode.length; i += 1) {
    hash = (hash * 31 + barcode.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Mock-only leniency: a real, unseeded (but well-formed) barcode gets a plausible generic
 * packaged-food item synthesized on first lookup instead of a 404, so scanning whatever's actually
 * on the table always "finds" something to log — the real backend has no such fallback and will
 * 404 genuinely unknown barcodes; this exists purely so barcode scanning is demoable/testable
 * on-device without needing a live OpenFoodFacts-backed API yet. Persisted into `mockDb.foodItems`
 * (not just returned ad hoc) so re-scanning the same product is stable and it shows up in
 * `/food/search/` like any other seeded item.
 */
function synthesizeFoodItem(barcode: string): (typeof SEED_FOOD_ITEMS)[number] {
  const hash = hashBarcode(barcode);
  const item = {
    id: 100_000 + mockDb.foodItems.length, // separate id space from the seeded food-item ids
    barcode,
    name: `Packaged item (#${barcode.slice(-4)})`,
    calories_per_100g: 220 + (hash % 260), // 220–480, typical packaged/processed range
    protein_g_per_100g: Math.round((4 + (hash % 14)) * 10) / 10, // 4–18g
    carbs_g_per_100g: Math.round((20 + (hash % 45)) * 10) / 10, // 20–65g
    fat_g_per_100g: Math.round((5 + (hash % 22)) * 10) / 10, // 5–27g
    source: 'mock-generic',
    last_fetched: new Date().toISOString(),
  };
  mockDb.foodItems.push(item);
  return item;
}

function summarize(entries: FoodEntry[]): MacroSummary {
  return entries.reduce<MacroSummary>(
    (acc, entry) => ({
      calories_in: acc.calories_in + entry.calories,
      protein_g: acc.protein_g + entry.protein_g,
      carbs_g: acc.carbs_g + entry.carbs_g,
      fat_g: acc.fat_g + entry.fat_g,
    }),
    { calories_in: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

function budgetEntry(consumed: number, target: number): MacroBudgetEntry {
  const wholeConsumed = Math.trunc(consumed);
  const wholeTarget = Math.trunc(target);
  return {
    consumed: wholeConsumed,
    target: wholeTarget,
    remaining: Math.max(0, wholeTarget - wholeConsumed),
    over: wholeConsumed > wholeTarget && wholeTarget > 0,
  };
}

function foodEntriesMacroSummary(entries: FoodEntry[], userId: string): FoodEntriesMacroSummary {
  const consumed = summarize(entries);
  const profile = mockDb.dietProfiles[userId];
  return {
    calories: budgetEntry(consumed.calories_in, profile?.daily_calories ?? 0),
    protein_g: budgetEntry(consumed.protein_g, profile?.daily_protein_g ?? 0),
    carbs_g: budgetEntry(consumed.carbs_g, profile?.daily_carbs_g ?? 0),
    fat_g: budgetEntry(consumed.fat_g, profile?.daily_fat_g ?? 0),
  };
}

/** Recompute + persist the day's aggregate from its entries, preserving non-food fields if present. */
function recomputeDailyLog(userId: string, date: string): DailyLog {
  const entries = mockDb.foodEntries.filter((entry) => entry.date === date);
  const summary = summarize(entries);
  const key = `${userId}:${date}`;
  const existing = mockDb.dailyLogs[key];
  const log: DailyLog = {
    id: existing?.id ?? Math.floor(Math.random() * 1_000_000),
    date,
    calories_in: summary.calories_in,
    calories_out: existing?.calories_out ?? 0,
    protein_g: summary.protein_g,
    carbs_g: summary.carbs_g,
    fat_g: summary.fat_g,
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

// GET /insights/weekly-diet-review/ — latest stored review, optionally filtered by Monday.
registerMock('GET', '/insights/weekly-diet-review/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;

  const weekStart = request.query.week_start;
  if (weekStart !== undefined) {
    const parsed = validISODate(weekStart);
    if (!parsed) return { status: 400, body: { error: 'Invalid week_start.' } };
    if (parsed.getUTCDay() !== 1) {
      return { status: 400, body: { error: 'week_start must be a Monday.' } };
    }
  }

  ensureWeeklyDietReviewSeeded(user.id);
  const reviews = mockDb.weeklyDietReviews[user.id];
  const review = weekStart
    ? reviews.find((candidate) => candidate.week_start === weekStart)
    : [...reviews].sort((a, b) => b.week_start.localeCompare(a.week_start))[0];

  if (!review) return { status: 404, body: { error: 'no_review' } };
  return { status: 200, delayMs: 250, body: styleB(review) };
});

// GET /food/entries/ — the day's entries + macro summary (§8).
registerMock('GET', '/food/entries/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  ensureFoodDbSeeded();
  const date = request.query.date ?? todayISO();
  const entries = mockDb.foodEntries.filter((entry) => entry.date === date);
  return {
    status: 200,
    delayMs: 250,
    body: styleB({ entries, macro_summary: foodEntriesMacroSummary(entries, user.id) }),
  };
});

// POST /food/entries/ — create an entry, recompute the day, return entry + daily_totals (§8).
registerMock('POST', '/food/entries/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;

  const body = (request.body ?? {}) as Partial<FoodEntry>;
  const fieldErrors: Record<string, string[]> = {};
  if (!body.food_name) fieldErrors.food_name = ['This field is required.'];
  if (!body.meal_type) fieldErrors.meal_type = ['This field is required.'];
  if (Object.keys(fieldErrors).length > 0) return { status: 400, body: fieldErrors };

  const date = body.date ?? todayISO();
  const entry: FoodEntry = {
    id: mockDb.nextFoodEntryId++,
    date,
    meal_type: body.meal_type!,
    food_item: body.food_item ?? null,
    food_name: body.food_name!,
    portion_g: body.portion_g ?? null,
    calories: body.calories ?? 0,
    protein_g: body.protein_g ?? 0,
    carbs_g: body.carbs_g ?? 0,
    fat_g: body.fat_g ?? 0,
    source: body.source ?? 'manual',
    ai_guess: body.ai_guess ?? null,
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

// DELETE /food/entries/:id/ — remove (must be the user's) + recompute (§8).
registerMock('DELETE', '/food/entries/:id/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  const id = Number(request.params.id);
  const index = mockDb.foodEntries.findIndex((entry) => entry.id === id);
  if (index === -1) return { status: 404, body: { detail: 'Not found.' } };
  const [removed] = mockDb.foodEntries.splice(index, 1);
  recomputeDailyLog(user.id, removed.date);
  return { status: 204, delayMs: 200 };
});

// POST /food/items/ — create a user-owned food; owner/source are server-controlled (§8).
registerMock('POST', '/food/items/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  ensureFoodDbSeeded();

  const body = (request.body ?? {}) as Record<string, unknown>;
  const requiredNumbers = [
    'calories_per_100g',
    'protein_g_per_100g',
    'carbs_g_per_100g',
    'fat_g_per_100g',
  ] as const;
  const fieldErrors: Record<string, string[]> = {};
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  if (name === null) {
    fieldErrors.name = ['This field is required.'];
  } else if (name.length === 0) {
    fieldErrors.name = ['This field may not be blank.'];
  } else if (name.length > 255) {
    fieldErrors.name = ['Ensure this field has no more than 255 characters.'];
  }
  const barcodeValue = typeof body.barcode === 'string' ? body.barcode.trim() : body.barcode;
  if (typeof barcodeValue === 'string' && barcodeValue.length > 50) {
    fieldErrors.barcode = ['Ensure this field has no more than 50 characters.'];
  }
  const parsedNumbers: Record<(typeof requiredNumbers)[number], number> = {
    calories_per_100g: 0,
    protein_g_per_100g: 0,
    carbs_g_per_100g: 0,
    fat_g_per_100g: 0,
  };
  for (const field of requiredNumbers) {
    const rawValue = body[field];
    const value =
      typeof rawValue === 'number' || (typeof rawValue === 'string' && rawValue.trim().length > 0)
        ? Number(rawValue)
        : Number.NaN;
    if (!Number.isFinite(value)) {
      fieldErrors[field] = ['A valid number is required.'];
    } else {
      parsedNumbers[field] = value;
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { status: 400, body: fieldErrors };

  const barcode = typeof barcodeValue === 'string' && barcodeValue.length > 0 ? barcodeValue : null;
  if (
    barcode &&
    mockDb.foodItems.some(
      (item) => item.barcode === barcode && mockDb.foodItemOwnerByItemId[item.id] === user.id,
    )
  ) {
    return {
      status: 400,
      body: { barcode: ['A food with this barcode already exists.'] },
    };
  }

  const item: FoodItem = {
    id: mockDb.nextFoodItemId++,
    barcode,
    name: name ?? '',
    ...parsedNumbers,
    source: 'custom',
    last_fetched: new Date().toISOString(),
  };
  mockDb.foodItems.push(item);
  mockDb.foodItemOwnerByItemId[item.id] = user.id;
  return { status: 201, delayMs: 300, body: styleB(item) };
});

// GET /food/search/ — caller's custom matches first, then shared catalog matches (§8).
registerMock('GET', '/food/search/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  ensureFoodDbSeeded();
  const q = (request.query.q ?? '').trim().toLowerCase();
  const rawPageSize = request.query.page_size;
  const parsedPageSize = rawPageSize && /^-?\d+$/.test(rawPageSize) ? Number(rawPageSize) : 20;
  const pageSize = Math.min(Math.max(1, parsedPageSize), 50);
  const matches = (item: FoodItem) => item.name.toLowerCase().includes(q);
  const customHits = q
    ? mockDb.foodItems.filter(
        (item) => mockDb.foodItemOwnerByItemId[item.id] === user.id && matches(item),
      )
    : [];
  const catalogHits = mockDb.foodItems.filter(
    (item) => mockDb.foodItemOwnerByItemId[item.id] === undefined && matches(item),
  );
  const seen = new Set<number>();
  const results: FoodItem[] = [];
  for (const item of [...customHits, ...catalogHits]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    results.push(item);
    if (results.length >= pageSize) break;
  }
  return { status: 200, delayMs: 300, body: styleB(results) };
});

// GET /food/usuals/ — deterministic fixture matching services/usuals.py's bare response shape.
registerMock('GET', '/food/usuals/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  const requestedMeal = request.query.meal_type ?? 'lunch';
  const parsedMealType = mealTypeSchema.safeParse(requestedMeal);
  if (!parsedMealType.success) return { status: 400, body: { error: 'Invalid meal_type.' } };
  const mealType = parsedMealType.data;

  const observedAt = new Date().toISOString();
  const lastLoggedOn = '2026-10-15';
  return {
    status: 200,
    delayMs: 250,
    body: styleB({
      meal_type: mealType,
      observed_at: observedAt,
      suggestions: USUALS_BY_MEAL[mealType].map((foodName, index) => ({
        kind: index === 2 ? ('yesterday' as const) : ('repeat' as const),
        food_name: foodName,
        meal_type: mealType,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        portion_g: 0,
        food_item: null,
        reason_label: index === 2 ? `Yesterday's ${mealType} again` : `Most weekday ${mealType}s`,
        times_logged: index === 2 ? 1 : 2,
        last_logged_on: lastLoggedOn,
      })),
    }),
  };
});

// GET /food/lookup/barcode/:barcode/ — exact seeded match; else a synthesized generic item for any
// well-formed (real) barcode so on-device testing always finds something; else a genuine 404 for
// garbage input (§8 — see `synthesizeFoodItem` above for why the mock diverges from strict 404
// here while the real API won't).
registerMock('GET', '/food/lookup/barcode/:barcode/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  ensureFoodDbSeeded();
  const barcode = request.params.barcode ?? '';
  const existing = mockDb.foodItems.find((candidate) => candidate.barcode === barcode);
  if (existing) return { status: 200, delayMs: 250, body: styleB(existing) };
  if (WELL_FORMED_BARCODE.test(barcode)) {
    return { status: 200, delayMs: 250, body: styleB(synthesizeFoodItem(barcode)) };
  }
  return { status: 404, delayMs: 250, body: { detail: 'Food item not found.' } };
});

// POST /food/photo/ — AI vision estimate (multipart; the mock ignores the file). Enforces the
// 10/day free limit and returns a deterministic plausible estimate (§8).
registerMock('POST', '/food/photo/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
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
      guessed_count: 1,
      items: [
        {
          name: 'Steamed rice',
          portion_label: '1 cup',
          portion_grams: 150,
          est_calories: 205,
          est_protein_g: 4,
          est_carbs_g: 45,
          est_fat_g: 1,
          confidence: 0.92,
          guessed: false,
          guess_note: null,
          remembered: false,
        },
        {
          name: 'Paneer, pan-fried',
          portion_label: '80g',
          portion_grams: 80,
          est_calories: 235,
          est_protein_g: 14,
          est_carbs_g: 4,
          est_fat_g: 18,
          confidence: 0.88,
          guessed: false,
          guess_note: null,
          remembered: false,
        },
        {
          name: 'Dressing',
          portion_label: null,
          portion_grams: 14,
          est_calories: 135,
          est_protein_g: 0,
          est_carbs_g: 0,
          est_fat_g: 15,
          confidence: 0.5,
          guessed: true,
          guess_note: 'The dressing. Ghee or oil changes 90 kcal.',
          remembered: false,
        },
        {
          name: 'Sautéed greens',
          portion_label: '1 cup',
          portion_grams: 100,
          est_calories: 80,
          est_protein_g: 3,
          est_carbs_g: 8,
          est_fat_g: 4,
          confidence: 0.95,
          guessed: false,
          guess_note: null,
          remembered: false,
        },
      ],
    }),
  };
});

// POST /food/label-ocr/ — nutrition-label estimate (multipart; the mock ignores the file).
// Its 10/day quota is independent of the photo quota, matching the backend's separate Redis key.
registerMock('POST', '/food/label-ocr/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  const key = `${user.id}:${todayISO()}`;
  const used = mockDb.labelOcrQuotaByUserDate[key] ?? 0;
  if (used >= LABEL_DAILY_LIMIT) {
    return {
      status: 429,
      delayMs: 200,
      body: { error: 'Daily label scan limit reached. Enter meal manually.' },
    };
  }
  mockDb.labelOcrQuotaByUserDate[key] = used + 1;
  return {
    status: 200,
    delayMs: 900,
    body: styleB({
      name: 'Protein bar',
      portion_grams: 60,
      est_calories: 210,
      est_protein_g: 20,
      est_carbs_g: 22,
      est_fat_g: 6,
      servings_per_container: 2.5,
      confidence: 0.95,
      guessed: false,
      guess_note: null,
      remembered: false,
    }),
  };
});

// GET /daily-summary/ — full day payload (§10). Layer 1 mostly uses /food/entries/; this backs the
// hook for Layer 2 (net calories, exercise) and keeps the contract exercised.
registerMock('GET', '/daily-summary/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  const date = request.query.date ?? todayISO();
  const log = recomputeDailyLog(user.id, date);
  const foodEntries = mockDb.foodEntries.filter((entry) => entry.date === date);
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

// PATCH /daily-summary/water/ — update today's water total (§10).
registerMock('PATCH', '/daily-summary/water/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;

  const body = (request.body ?? {}) as { water_ml?: unknown };
  const waterMl = Number(body.water_ml);
  if (!Number.isInteger(waterMl) || waterMl < 0) {
    return { status: 400, body: { water_ml: ['A valid integer is required.'] } };
  }

  const date = todayISO();
  const log = recomputeDailyLog(user.id, date);
  const updated: DailyLog = { ...log, water_ml: waterMl };
  mockDb.dailyLogs[`${user.id}:${date}`] = updated;
  return { status: 200, delayMs: 200, body: styleB(updated) };
});
