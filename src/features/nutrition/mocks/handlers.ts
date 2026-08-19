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
import type { FoodEntry, MacroSummary } from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';
import { SEED_FOOD_ITEMS } from '@/features/nutrition/mocks/fixtures';

const PHOTO_DAILY_LIMIT = 10; // free tier — API_REFERENCE.md §8/§16

const UNAUTHORIZED = {
  status: 401 as const,
  body: styleAError('UNAUTHORIZED', 'Authentication required.'),
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureFoodDbSeeded(): void {
  if (mockDb.foodItems.length === 0) mockDb.foodItems = [...SEED_FOOD_ITEMS];
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
    body: styleB({ entries, macro_summary: summarize(entries) }),
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
    food_name: body.food_name!,
    calories: body.calories ?? 0,
    protein_g: body.protein_g ?? 0,
    carbs_g: body.carbs_g ?? 0,
    fat_g: body.fat_g ?? 0,
    source: body.source ?? 'manual',
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

// GET /food/search/ — substring match over the seeded food DB (§8).
registerMock('GET', '/food/search/', (request) => {
  const user = requireMockUser(request);
  if (!user) return UNAUTHORIZED;
  ensureFoodDbSeeded();
  const q = (request.query.q ?? '').toLowerCase();
  const pageSize = Number(request.query.page_size ?? 20);
  const results = mockDb.foodItems
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, Number.isFinite(pageSize) ? pageSize : 20);
  return { status: 200, delayMs: 300, body: styleB(results) };
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
