# Coreo Health API — Frontend Reference

Complete reference for every HTTP endpoint the backend exposes, with the request
and response shapes, auth requirements, query params, status codes, and enum
values a frontend engineer needs to build the features end to end.

- **Base URL:** all routes are prefixed with `/api/v1/`
- **Content type:** `application/json` unless a route accepts a file upload
  (those use `multipart/form-data` — flagged per endpoint)
- **Only JSON is returned** (no HTML responses)

---

## Table of contents

1. [Authentication & tokens](#1-authentication--tokens)
2. [Response conventions](#2-response-conventions)
3. [Users — auth](#3-users--auth)
4. [Users — profile & account](#4-users--profile--account)
5. [Users — diet profile (onboarding)](#5-users--diet-profile-onboarding)
6. [Users — verification](#6-users--verification)
7. [Users — password](#7-users--password)
8. [Food tracking](#8-food-tracking)
9. [Exercise tracking](#9-exercise-tracking)
10. [Insights & daily summary](#10-insights--daily-summary)
11. [Data import](#11-data-import)
12. [Meal plans](#12-meal-plans)
13. [Meal actions](#13-meal-actions)
14. [Meal assistant (AI)](#14-meal-assistant-ai)
15. [Core / system](#15-core--system)
16. [Quota limits](#16-quota-limits)
17. [Enum reference](#17-enum-reference)

---

## 1. Authentication & tokens

Auth uses **custom JWT** (HS256) sent as a Bearer token.

```
Authorization: Bearer <access_token>
```

| Token | Lifetime | Notes |
|-------|----------|-------|
| `access` | **60 minutes** | Sent on every protected request. |
| `refresh` | **7 days** | Exchanged for a new access token at `/users/token/refresh/`. |

- Tokens are obtained from **register** and **login**, which both return
  `{ access, refresh }`.
- The access token carries `user_id`, `email`, `exp`, `iat`, `token_type`, `jti`.
- **Logout** blacklists the current token's `jti` in Redis until it expires — a
  blacklisted token returns `401`.
- **All endpoints require authentication by default.** Public (no-auth)
  endpoints are explicitly marked 🔓 below. Everything else needs a valid Bearer
  token or returns `401 UNAUTHORIZED`.

### Refresh flow
When a request returns `401` with `Token has expired`, call
`POST /users/token/refresh/` with the stored refresh token, replace the access
token, and retry. If refresh also fails, send the user back to login.

---

## 2. Response conventions

Two response envelope styles exist in this API. Check per-endpoint — they are
**not** uniform.

### Style A — wrapped envelope (users + core apps)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```
Errors:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid registration data",
    "details": { "email": ["User with this email already exists."] }
  }
}
```

### Style B — bare payload (food, exercise, insights, meals apps)
Returns the object/array directly, e.g. `{ "entries": [...], "macro_summary": {...} }`
or `[ {...}, {...} ]`. Errors are bare too, e.g. `{ "error": "invalid_date" }`
or DRF field errors `{ "field_name": ["message"] }`.

### Framework-level errors (DRF exception handler)
Unhandled auth/permission/404/validation errors from the framework always use
Style A with these codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND`
(404), `VALIDATION_ERROR` (400), `SERVER_ERROR` (500).

---

## 3. Users — auth

### 🔓 POST `/users/register/`
Create an account. Returns the user and tokens.

**Request**
```json
{
  "email": "user@example.com",
  "password": "min-8-chars",
  "password_confirm": "min-8-chars",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+15551234567",
  "timezone": "UTC",
  "date_of_birth": "1990-05-01",
  "gender": "female"
}
```
Required: `email`, `password`, `password_confirm`, `first_name`, `last_name`.
Optional: `phone`, `timezone` (default `UTC`), `date_of_birth`, `gender`
(see [Gender enum](#gender)). Password must pass Django strength validation and
match `password_confirm`.

**201 Created** → Style A `data: { user: <User>, tokens: { access, refresh } }`
**400** → `VALIDATION_ERROR` (bad data / email taken / passwords mismatch) or
`REGISTRATION_ERROR`.

### 🔓 POST `/users/login/`
**Request** `{ "email": "...", "password": "..." }`
**200** → Style A `data: { user: <User>, tokens: { access, refresh } }`
**401** → `INVALID_CREDENTIALS` or `ACCOUNT_DISABLED`.

### 🔓 POST `/users/token/refresh/`
**Request** `{ "refresh": "<refresh_token>" }`
**200** → Style A `data: { access: "<new_access_token>" }`
**400** → `VALIDATION_ERROR` or `TOKEN_REFRESH_ERROR`.

### POST `/users/logout/`
Blacklists the token in the `Authorization` header. **200** → Style A `{ success, message }`.

### The `<User>` object
Returned by register/login/profile.
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "full_name": "Jane Doe",
  "phone": "+15551234567",
  "date_of_birth": "1990-05-01",
  "age": 35,
  "gender": "female",
  "timezone": "UTC",
  "is_premium": false,
  "email_verified": false,
  "phone_verified": false,
  "profile": {
    "avatar": null,
    "bio": "",
    "preferred_language": "en",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  },
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```
Read-only: `id`, `email`, `age`, `full_name`, `is_premium`, `email_verified`,
`phone_verified`, `created_at`, `updated_at`.

---

## 4. Users — profile & account

### GET `/users/profile/`
**200** → Style A `data: { user: <User> }`.

### PUT `/users/profile/update/`
Partial update of account fields. **Request** (all optional):
```json
{ "first_name": "...", "last_name": "...", "phone": "...",
  "date_of_birth": "1990-05-01", "gender": "male", "timezone": "Asia/Kolkata" }
```
`phone` must be digits/`+`/`-`/spaces; `date_of_birth` cannot be in the future.
**200** → Style A `data: { user: <User> }` · **400** → `VALIDATION_ERROR`.

### DELETE `/users/me/`
Deletes the authenticated user account. **204 No Content**.

### DELETE `/users/me/data/`
Deletes health data (daily logs, insight cards, import tasks, custom exercises)
but keeps the account. **204 No Content**.

---

## 5. Users — diet profile (onboarding)

The diet profile drives meal-plan generation and nutrition targets. This route
uses **bare payloads** (Style B).

### GET `/users/me/diet-profile/`
**200** →
```json
{
  "onboarding_complete": false,
  "goal_type": null,
  "weight_kg": 70.0,
  "target_weight_kg": 65.0,
  "height_cm": 175.0,
  "activity_level": null,
  "diet_type": null,
  "allergies": [],
  "disliked_foods": [],
  "cuisine_preference": null,
  "cooking_time_max": 30,
  "meal_frequency": 4,
  "budget_tier": null,
  "eating_pattern": null,
  "cooking_frequency": null,
  "health_conditions": [],
  "target_source": "calculated",
  "daily_calories": 2000,
  "daily_protein_g": 150.0,
  "daily_carbs_g": 200.0,
  "daily_fat_g": 60.0
}
```
`onboarding_complete` is `true` once `goal_type`, `diet_type`, and
`cuisine_preference` are all set. Empty choice fields serialize as `null`.

### PUT `/users/me/diet-profile/`
Partial update. Any subset of the fields above (except read-only outputs).

- `allergies`, `disliked_foods`, `health_conditions` must be **lists**.
  `health_conditions` max 3 items; valid values: `diabetes`, `pcos`, `thyroid`,
  `heart_health`, `high_bp`, `glp_1`, `none`, `prefer_not_to_say`.
- Choice fields: see [Enum reference](#17-enum-reference) (`goal_type`,
  `activity_level`, `diet_type`, `cuisine_preference`, `budget_tier`,
  `eating_pattern`, `cooking_frequency`).
- **Targets auto-recalculate** from weight/height/age/gender/activity/goal unless
  you send `target_source: "manual"`, in which case your `daily_*` values are kept.

**200** → same shape as GET (with updated `onboarding_complete`).
**400** → bare DRF field errors.

---

## 6. Users — verification

These endpoints validate input and return success envelopes; email/SMS sending
is **stubbed (TODO)** server-side — treat as wired but non-functional for now.

| Method | Path | Auth | Body | Notes |
|--------|------|------|------|-------|
| POST | `/users/verify-email/` | ✅ | `{}` | 400 `ALREADY_VERIFIED` if already verified |
| 🔓 POST | `/users/verify-email/confirm/` | 🔓 | `{ "token": "..." }` | |
| POST | `/users/verify-phone/` | ✅ | `{}` | 400 `NO_PHONE_NUMBER` / `ALREADY_VERIFIED` |
| POST | `/users/verify-phone/confirm/` | ✅ | `{ "code": "1234" }` | code 4–6 chars |

All return Style A `{ success: true, message }` on success, `VALIDATION_ERROR` on
bad input.

---

## 7. Users — password

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/users/password-change/` | ✅ | `{ current_password, new_password, new_password_confirm }` |
| 🔓 POST | `/users/password-reset/` | 🔓 | `{ email }` |
| 🔓 POST | `/users/password-reset/confirm/` | 🔓 | `{ token, new_password, new_password_confirm }` |

- `password-change` verifies `current_password`, checks the new passwords match
  and pass strength validation. **200** Style A success, **400** `VALIDATION_ERROR`.
- `password-reset` always returns **200** with a generic message (no user
  enumeration). Email sending is **stubbed (TODO)**.
- `password-reset/confirm` validates input (token verification is **stubbed**).

---

## 8. Food tracking

Bare payloads (Style B). All require auth.

### GET `/food/entries/`
List food entries and the day's macro summary.
**Query:** `date` (optional, `YYYY-MM-DD`; defaults to today for the summary; when
omitted, entries are unfiltered/all-time but the summary uses today).
**200** →
```json
{
  "entries": [ <FoodEntry> ],
  "macro_summary": { "calories_in": 1500, "protein_g": 90, "carbs_g": 180, "fat_g": 50 }
}
```

### POST `/food/entries/`
Create a food entry. Recomputes the daily log and queues an embedding task.
**Request**
```json
{
  "date": "2026-07-05",
  "meal_type": "breakfast",
  "food_name": "Oatmeal",
  "calories": 300,
  "protein_g": 10,
  "carbs_g": 50,
  "fat_g": 5,
  "source": "manual"
}
```
`meal_type`: `breakfast|lunch|dinner|snack`. `source`:
`photo|barcode|manual|import|plan`.
**201** → the created `<FoodEntry>` plus:
```json
{ "...FoodEntry fields...",
  "daily_totals": { "calories_in": 300, "protein_g": 10, "carbs_g": 50,
                    "fat_g": 5, "calories_out": 0, "net_calories": 300 } }
```
**400** → bare DRF field errors.

### DELETE `/food/entries/{entry_id}/`
Deletes the entry (must belong to the user) and recomputes the daily log.
**204** · **404** if not found.

### `<FoodEntry>` object
```json
{
  "id": 1, "date": "2026-07-05", "meal_type": "breakfast",
  "food_name": "Oatmeal", "calories": 300, "protein_g": 10,
  "carbs_g": 50, "fat_g": 5, "source": "manual",
  "created_at": "2026-07-05T08:00:00Z"
}
```

### GET `/food/lookup/barcode/{barcode}/`
Look up a food product by barcode.
**200** → `<FoodItem>` · **404** `{ "detail": "Food item not found." }` ·
**503** `{ "error": "Food database is temporarily unavailable." }`.

### GET `/food/search/`
Search the food database.
**Query:** `q` (search string), `page_size` (int, default `20`).
**200** → array of `<FoodItem>` · **503** if the DB is down.

### `<FoodItem>` object
```json
{
  "id": 1, "barcode": "01234567", "name": "Greek Yogurt",
  "calories_per_100g": 59, "protein_g_per_100g": 10,
  "carbs_g_per_100g": 3.6, "fat_g_per_100g": 0.4,
  "source": "openfoodfacts", "last_fetched": "2026-07-01T00:00:00Z"
}
```

### POST `/food/photo/`
**`multipart/form-data`** — analyze a meal photo with AI vision.
**Form field:** `image` (file, max **5,000,000 bytes**).
**Rate limit:** **10 photos/user/day** (429 after that).
**200** →
```json
{ "name": "Grilled chicken salad", "portion_grams": 350,
  "est_calories": 420, "est_protein_g": 38, "est_carbs_g": 12, "est_fat_g": 22 }
```
This is an **estimate only** — the frontend should let the user confirm/edit and
then POST it as a food entry. It does **not** create an entry itself.
**400** `{ "error": "Image is required." }` / `"Image is too large."` ·
**422** `{ "error": "Photo couldn't be analyzed. Enter your meal manually." }` ·
**429** `{ "error": "Daily photo limit reached. Enter meal manually." }`.

---

## 9. Exercise tracking

Bare payloads. All require auth.

### GET `/exercise/exercises/`
List the user's custom exercises.
**Query:** `mine=true` **required** to return data — without it returns `[]`.
**200** → array of `<CustomExercise>`.

### POST `/exercise/exercises/`
Create a custom exercise.
**Request** `{ "name": "Bench Press", "type": "strength", "met_value": 6.0 }`
`type`: `strength|cardio`.
**201** → `<CustomExercise>` · **400** `{ "name": ["An exercise with this name already exists."] }`.

`<CustomExercise>` → `{ id, name, type, met_value, created_at }`.

### GET `/exercise/entries/`
**Query:** `date` (optional `YYYY-MM-DD` filter).
**200** → array of `<ExerciseEntry>`.

### POST `/exercise/entries/`
Create an exercise entry. `calories_burned` is auto-computed from
`met_value × user weight × (duration_min/60)` when possible; otherwise the posted
`calories_burned` (or 0) is used.
**Request**
```json
{
  "date": "2026-07-05",
  "exercise_name": "Running",
  "sets": null, "reps_per_set": null, "weight_kg": null,
  "duration_min": 30, "met_value": 9.8,
  "calories_burned": 0, "source": "manual"
}
```
`source`: `manual|import`.
**201** → the `<ExerciseEntry>` plus `daily_totals` (same shape as food).
**400** → bare DRF field errors.

### DELETE `/exercise/entries/{entry_id}/`
**204** · **404** if not found.

`<ExerciseEntry>` →
```json
{ "id": 1, "date": "2026-07-05", "exercise_name": "Running",
  "sets": null, "reps_per_set": null, "weight_kg": null,
  "duration_min": 30, "met_value": 9.8, "calories_burned": 340,
  "source": "manual", "created_at": "2026-07-05T18:00:00Z" }
```

---

## 10. Insights & daily summary

Bare payloads. All require auth.

### GET `/daily-summary/`
The main dashboard payload for a day.
**Query:** `date` (optional `YYYY-MM-DD`, default today).
**200** →
```json
{
  "daily_log": <DailyLog>,
  "net_calories": 300,
  "food_log_count": 42,
  "food_entries": [ <FoodEntry> ],
  "exercise_entries": [ <ExerciseEntry> ]
}
```

### PATCH `/daily-summary/water/`
Update today's water intake.
**Request** `{ "water_ml": 500 }` (must be an integer).
**200** → `<DailyLog>` · **400** `{ "water_ml": ["A valid integer is required."] }`.

### `<DailyLog>` object (read-only)
```json
{
  "id": 1, "date": "2026-07-05",
  "calories_in": 1800, "calories_out": 400,
  "protein_g": 120, "carbs_g": 200, "fat_g": 55,
  "water_ml": 1500, "steps": 8000, "weight_kg": 70,
  "sleep_hours": 7.5, "hrv": 45, "source": "manual",
  "workout_sessions": 1
}
```

### GET `/insights/`
Correlation insights. Requires **≥30 days** of logged data.
**200 (not ready)** →
```json
{ "status": "not_enough_data", "days_logged": 12, "days_remaining": 18 }
```
**200 (ready)** →
```json
{ "status": "ready", "insights": [ <InsightCard> ] }
```
**200 (no insights)** → `{ "status": "no_insights", "message": "Keep logging..." }`.

### POST `/insights/generate/`
Force insight regeneration.
**200** → `{ "status": "done", "insight_count": 3 }` or
`{ "status": "no_data", "message": "Import data first." }`.

> Note: `insights/generate/` is also mounted at `/import/generate/` (same handler).

### `<InsightCard>` object
```json
{
  "id": 1, "col_x": "sleep_hours", "col_y": "hrv",
  "r_value": 0.62, "lag_days": 1,
  "insight_text": "Patterns suggest more sleep may be related to higher HRV.",
  "autocorrelation_warning": false,
  "created_at": "2026-07-05T00:00:00Z",
  "disclaimer": "Health patterns only. Not medical advice. Consult a healthcare provider for medical decisions."
}
```

---

## 11. Data import

Bare payloads. All require auth. Import runs asynchronously (Celery); poll status.

### POST `/import/`
**`multipart/form-data`** — upload a health export file.
**Form fields:** `file` (the upload), `file_type` (`apple_health|mfp|strava`).
**201** → `{ "task_id": 123 }`
**400** → `{ "file": ["This field is required."] }` or `{ "file_type": ["Invalid file type."] }`.

### GET `/import/{task_id}/`
Poll import progress.
**200** →
```json
{ "status": "processing", "progress": 40, "error": "" }
```
`status`: `pending|processing|complete|failed`. When `complete`, the payload adds
`"ready_for_inference": true`. A `pending` task older than 5 minutes returns
`status: "failed"` with `error: "Analysis taking longer than expected. Please retry."`.
**404** if the task isn't the user's.

---

## 12. Meal plans

Bare payloads. All require auth. Plans generate asynchronously — create, then poll
the detail endpoint until `status` is `ready` (or `failed`).

Meal-plan routes are mounted at **`/meal-plans/`**. (They are also included under
`/meals/meal-plans/` — prefer the top-level `/meal-plans/` paths below.)

### POST `/meal-plans/`
Create (or fetch existing) plan for a date. **Idempotent** — re-requesting an
existing plan does not consume quota.
**Request**
```json
{ "date": "2026-07-05",
  "plan_mode": "standard",
  "regeneration_reason": "" }
```
`plan_mode`: `standard|historical` (default `standard`). `date` must be ISO
`YYYY-MM-DD`.
**202 Accepted** → `{ "plan_id": 10, "status": "pending" }` (new plan, generating).
**200** → `{ "plan_id": 10, "status": "ready" }` (existing plan returned).
**400** → `{ "error": "invalid_date" }` / `{ "error": "invalid_plan_mode", "valid": ["standard","historical"] }`.
**429** → [quota exceeded](#quota-error-shape) (limit 2/day free tier).

### GET `/meal-plans/{date}/`
Fetch a plan and its meals. `date` = `YYYY-MM-DD`. Sends `Cache-Control: no-cache`.
**200** →
```json
{
  "id": 10, "status": "ready",
  "date_start": "2026-07-05", "date_end": "2026-07-05",
  "total_calories": 2000, "total_protein_g": 150,
  "total_carbs_g": 200, "total_fat_g": 60,
  "validation_result": { "self_check_status": "ok", "macro_ok": true,
                         "violation_count": 0, "self_check_issues": [] },
  "self_check_status": "ok",
  "plan_mode": "standard",
  "historical_fallback_reason": "",
  "meals": [ <PlannedMeal> ]
}
```
`status`: `pending|generating|validating|ready|failed`. Only non-replaced meals
are included. **404** if no plan for that date · **400** `invalid_date`.

### POST `/meal-plans/{date}/regenerate/`
Discard and regenerate the plan.
**Request** `{ "regeneration_reason": "too_boring", "plan_mode": "standard" }`
`regeneration_reason` **required**, must be a valid
[RegenerationReason](#regenerationreason).
**202** → `{ "plan_id": 11, "status": "pending" }`.
**400** → `invalid_date` / `invalid_regeneration_reason` / `invalid_plan_mode`.
**429** → quota exceeded (limit 2/day free tier).

### `<PlannedMeal>` object
```json
{
  "id": 100, "date": "2026-07-05", "meal_type": "breakfast",
  "name": "Masala Oats", "calories_kcal": 350,
  "protein_g": 15, "carbs_g": 55, "fat_g": 8,
  "rationale": "High-fiber start aligned to your goal.",
  "recipe_json": null,
  "replaced_at": null, "replacement_of_id": null,
  "constraint_violation": false,
  "status": "planned",
  "serving_size": "1 bowl",
  "portion_multiplier": 1.0,
  "base_calories_kcal": null, "base_protein_g": null,
  "base_carbs_g": null, "base_fat_g": null,
  "ingredients_json": [ { "name": "Oats", "quantity": "50g" } ],
  "prep_time_minutes": 15,
  "estimated_cost_tier": "budget_friendly",
  "confidence_note": ""
}
```
`meal_type`: `breakfast|lunch|snack|dinner`. `status`: `planned|logged_as_planned|
logged_modified|skipped|replaced|eaten_outside|missed`.

---

## 13. Meal actions

All operate on a specific meal within a plan: base path
`/meal-plans/{date}/meals/{meal_id}/...`. All require auth; return bare payloads.
State-guard failures return **409 Conflict** with an `error` string.

### GET `/meal-plans/{date}/meals/{meal_id}/recipe/`
Fetch (and lazily generate) the recipe for a meal. First view logs a `recipe_view`
event. Generation may consume the `recipe_generate` quota (5/day free).
**200** → the recipe JSON object · **429** quota exceeded · **404** meal/plan not found.

### POST `/meal-plans/{date}/meals/{meal_id}/log/`
Mark a meal as eaten (creates a `FoodEntry`, source `plan`). Idempotent for
already-logged meals.
**Request** `{ "actual_calories": 380 }` (optional — if it differs from the
planned calories, the meal is logged as *modified* and macros scale proportionally).
**200** → `{ "id": 100, "status": "logged_as_planned", "food_entry_id": 55 }`
(or `logged_modified`). **409** `{ "error": "..." }`.

### POST `/meal-plans/{date}/meals/{meal_id}/skip/`
**200** → `{ "status": "skipped" }` · **409** `{ "error": "already_skipped" }`.

### POST `/meal-plans/{date}/meals/{meal_id}/adjust-quantity/`
Scale a meal's portion and macros.
**Request** `{ "portion_multiplier": 1.5 }` (float, ≥ `0.01`). Sending `1.0` resets
to the base portion.
**200** → `{ "status": "ok", "calories_kcal": 525, "protein_g": 22.5,
"carbs_g": 82.5, "fat_g": 12 }`.
**400** `{ "error": "invalid_portion_multiplier" }` · **409** `{ "error": "meal_replaced" }`.

### POST `/meal-plans/{date}/meals/{meal_id}/feedback/`
**Request** `{ "feedback_type": "like", "note": "optional text" }`
`feedback_type`: see [FeedbackType](#feedbacktype).
**201** → `{ "id": 7 }` · **400** `{ "error": "invalid_feedback_type" }`.

### Replace a meal (two-step: preview → confirm)

**Step 1 — POST `/meal-plans/{date}/meals/{meal_id}/replace/preview/`**
**Request** `{ "preference": "something lighter" }` (optional free text).
Consumes `replace_preview` quota (5/day free).
**200** →
```json
{ "alternatives": [ { "name": "...", "calories_kcal": 300, "protein_g": 20,
                      "carbs_g": 30, "fat_g": 10, "ingredients_json": [...] },
                    { ... }, { ... } ],
  "preview_token": "opaque-token" }
```
**429** quota exceeded · **503** `{ "error": "service_temporarily_unavailable" }`.

**Step 2 — POST `/meal-plans/{date}/meals/{meal_id}/replace/confirm/`**
**Request** `{ "preview_token": "opaque-token", "chosen_index": 0 }`
`chosen_index` must be `0`, `1`, or `2` and within the alternatives list.
**200** → `{ "status": "ok", "meal_id": 101 }` (id of the new replacement meal).
**400** `{ "error": "invalid_chosen_index" }` ·
**404** `{ "error": "preview_not_found" }` (token expired; TTL 600s) ·
**409** `{ "error": "invalid_transition" }`.

### POST `/meal-plans/{date}/ate-something-else/`
Log an unplanned food against a meal slot.
**Request**
```json
{ "meal_type": "lunch",
  "planned_meal_id": 100,
  "description": "Restaurant pasta",
  "approx_calories": 700,
  "approx_protein_g": 20 }
```
Provide either `planned_meal_id` (preferred) or `meal_type` to locate the slot.
`carbs_g`/`fat_g` default to 0.
**200** → `{ "status": "ok", "remaining_calories": 300, "food_entry_id": 60 }`.
**404** `{ "error": "meal_not_found" }` · **409** `{ "error": "already_eaten_outside" }`.

---

## 14. Meal assistant (AI)

A guided AI assistant that proposes meal-plan edits from a fixed set of prompt
options. All require auth; bare payloads.

### GET `/meals/assistant-prompts/`
List the available assistant prompt buttons for a context.
**Query:** `context` **required** — currently only `meal_plan`.
**200** → `{ "options": [ { "id": 1, "display_text": "Make it lighter" } ] }`.
**400** → `{ "error": "context_required" }` or
`{ "error": "invalid_context", "valid": ["meal_plan"] }`.

### POST `/meal-plans/{date}/assistant/`
Send a chosen prompt option; the assistant responds with either a recipe or a
**proposal** the user must confirm. Consumes `assistant` quota (10/day free).
**Request** `{ "prompt_option_id": 1 }`
**200 (proposal)** →
```json
{ "proposal_id": "uuid", "summary": "Proposing: replace meal",
  "requires_confirmation": true, "preview": { ... }, "expires_at": "2026-07-05T00:10:00Z" }
```
**200 (recipe intent)** → `{ "recipe": { ... } }`.
**Errors:** `400 prompt_option_id_required` · `404 prompt_option_not_found` ·
`400 option_inactive` / `wrong_context` / `intent_not_allowed` / `out_of_scope` /
`intent_mismatch` / `unsupported_intent` · `429` quota exceeded ·
`502 { "error": "assistant_unavailable" }`.

### POST `/meal-plans/{date}/assistant/confirm/`
Execute a previously proposed action.
**Request** `{ "proposal_id": "uuid" }`
**200** → the result of the underlying action (shape depends on intent — e.g.
`{ "status": "ok", "meal_id": ... }`). Proposals expire after **600s**.
**404** `{ "error": "proposal_not_found" }` · **409** `{ "error": "invalid_transition" }`.

Assistant intents that can be proposed: `replace_meal`, `modify_meal`,
`adjust_quantity`, `skip_meal`, `log_meal`, `ate_something_else`,
`regenerate_plan`, `submit_feedback`, `get_recipe`.

---

## 15. Core / system

Uses Style A envelope.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| 🔓 GET | `/core/health-check/` | 🔓 | DB + cache health. `data: { status, timestamp, database, cache }` |
| 🔓 GET | `/core/app-info/` | 🔓 | `data: { name, version, environment, debug, build_date, commit_hash }` |
| GET | `/core/config/` | ✅ | Client config: `data: { config: { features, settings } }` |
| GET | `/core/stats/` | ✅ staff | `data: { statistics: { total_users, active_users, system_health } }`. **403** `PERMISSION_DENIED` for non-staff |
| POST | `/core/contact-support/` | ✅ | See below |

### POST `/core/contact-support/`
**Request**
```json
{ "subject": "Bug", "message": "Details...", "category": "bug", "attach_logs": false }
```
`category`: `bug|feature|support|other`. `subject` ≤ 200 chars.
**200** → Style A `data: { support_request: { id, subject, category, submitted_at } }`.
**400** → `VALIDATION_ERROR`.

### `/core/config/` payload
```json
{ "features": {},
  "settings": {
    "max_file_upload_size": 10485760,
    "support_email": "support@med_app.com",
    "privacy_policy_url": "https://med_app.com/privacy",
    "terms_url": "https://med_app.com/terms"
  } }
```

---

## 16. Quota limits

Rate-limited AI actions return **429** with a structured body. Limits are per-day,
per-user, and reset at UTC midnight.

| Action | Free tier | Premium tier |
|--------|-----------|--------------|
| `assistant` | 10 | 50 |
| `plan_generate` | 2 | 5 |
| `plan_regenerate` | 2 | 5 |
| `recipe_generate` | 5 | 20 |
| `replace_preview` | 5 | 20 |

### Quota error shape
```json
{
  "error": "quota_exceeded",
  "action": "plan_generate",
  "message": "You have reached your daily plan generation limit.",
  "limit": 2,
  "tier": "free",
  "quota_resets_at": "2026-07-06T00:00:00Z"
}
```
The frontend should surface `message` and can use `quota_resets_at` to show when
the action becomes available again.

---

## 17. Enum reference

### Gender
`male` · `female` · `other` · `prefer_not_to_say`

### GoalType (`goal_type`)
`lose_weight` · `maintain` · `gain_muscle` · `eat_healthier` · `manage_condition`

### ActivityLevel (`activity_level`)
`sedentary` · `light` · `moderate` · `active` · `very_active`

### DietType (`diet_type`)
`vegetarian` · `vegan` · `non_veg` · `eggetarian` · `jain` · `keto` · `low_carb`

### CuisinePreference (`cuisine_preference`)
`indian` · `south_indian` · `north_indian` · `mediterranean` · `any`

### BudgetTier (`budget_tier`)
`budget_friendly` · `moderate` · `premium`

### EatingPattern (`eating_pattern`)
`home_food` · `office_lunchbox` · `frequent_restaurants` · `hostel_pg` · `mixed`

### CookingFrequency (`cooking_frequency`)
`every_meal` · `once_daily` · `batch_cooking` · `minimal_cooking`

### TargetSource (`target_source`)
`calculated` · `manual`

### HealthConditions (`health_conditions`, max 3)
`diabetes` · `pcos` · `thyroid` · `heart_health` · `high_bp` · `glp_1` · `none` · `prefer_not_to_say`

### Food MealType
`breakfast` · `lunch` · `dinner` · `snack`

### Food Source
`photo` · `barcode` · `manual` · `import` · `plan`

### Exercise type
`strength` · `cardio`

### Exercise Source
`manual` · `import`

### Import FileType
`apple_health` · `mfp` · `strava`

### Import Status
`pending` · `processing` · `complete` · `failed`

### MealPlan Status
`pending` · `generating` · `validating` · `ready` · `failed`

### PlannedMeal Status
`planned` · `logged_as_planned` · `logged_modified` · `skipped` · `replaced` · `eaten_outside` · `missed`

### PlannedMeal MealType
`breakfast` · `lunch` · `snack` · `dinner`

### RegenerationReason
`too_boring` · `too_expensive` · `too_much_cooking` · `dont_like_foods` · `need_more_protein` · `make_lighter` · `different_cuisine` · `surprise_me`

### FeedbackType
`like` · `dislike` · `too_heavy` · `too_light` · `too_much_cooking` · `too_expensive` · `not_available` · `other`

### Assistant Context
`meal_plan`

---

## Endpoint index (quick scan)

| Method | Path | Auth |
|--------|------|------|
| POST | `/users/register/` | 🔓 |
| POST | `/users/login/` | 🔓 |
| POST | `/users/token/refresh/` | 🔓 |
| POST | `/users/logout/` | ✅ |
| GET | `/users/profile/` | ✅ |
| PUT | `/users/profile/update/` | ✅ |
| DELETE | `/users/me/` | ✅ |
| DELETE | `/users/me/data/` | ✅ |
| GET·PUT | `/users/me/diet-profile/` | ✅ |
| POST | `/users/verify-email/` | ✅ |
| POST | `/users/verify-email/confirm/` | 🔓 |
| POST | `/users/verify-phone/` | ✅ |
| POST | `/users/verify-phone/confirm/` | ✅ |
| POST | `/users/password-change/` | ✅ |
| POST | `/users/password-reset/` | 🔓 |
| POST | `/users/password-reset/confirm/` | 🔓 |
| GET·POST | `/food/entries/` | ✅ |
| DELETE | `/food/entries/{entry_id}/` | ✅ |
| GET | `/food/lookup/barcode/{barcode}/` | ✅ |
| GET | `/food/search/` | ✅ |
| POST | `/food/photo/` | ✅ |
| GET·POST | `/exercise/exercises/` | ✅ |
| GET·POST | `/exercise/entries/` | ✅ |
| DELETE | `/exercise/entries/{entry_id}/` | ✅ |
| GET | `/daily-summary/` | ✅ |
| PATCH | `/daily-summary/water/` | ✅ |
| GET | `/insights/` | ✅ |
| POST | `/insights/generate/` | ✅ |
| POST | `/import/` | ✅ |
| GET | `/import/{task_id}/` | ✅ |
| POST | `/meal-plans/` | ✅ |
| GET | `/meal-plans/{date}/` | ✅ |
| POST | `/meal-plans/{date}/regenerate/` | ✅ |
| GET | `/meals/assistant-prompts/` | ✅ |
| POST | `/meal-plans/{date}/assistant/` | ✅ |
| POST | `/meal-plans/{date}/assistant/confirm/` | ✅ |
| GET | `/meal-plans/{date}/meals/{meal_id}/recipe/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/log/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/skip/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/adjust-quantity/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/feedback/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/replace/preview/` | ✅ |
| POST | `/meal-plans/{date}/meals/{meal_id}/replace/confirm/` | ✅ |
| POST | `/meal-plans/{date}/ate-something-else/` | ✅ |
| GET | `/core/health-check/` | 🔓 |
| GET | `/core/app-info/` | 🔓 |
| GET | `/core/config/` | ✅ |
| GET | `/core/stats/` | ✅ staff |
| POST | `/core/contact-support/` | ✅ |

*🔓 = public (no auth). All others require `Authorization: Bearer <access_token>`.*
