# Getting started

How the app talks to the backend, how to run it locally, and where to help first. Rules and
conventions live in [`CLAUDE.md`](../CLAUDE.md), and structure in
[`architecture.md`](architecture.md); this page covers only what those don't. Written 2026-10-02
from a read-through of the code, so check details against the source if something looks off.

## Backend integration

### Env vars

Only two exist ([.env.example](.env.example)). Both are `EXPO_PUBLIC_*`, inlined at build time and not secret.

| Var                    | Default                                                   | Meaning                                                                       |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`  | `https://vesselled-maxton-ringlike.ngrok-free.dev/api/v1` | Backend base URL, including `/api/v1`                                         |
| `EXPO_PUBLIC_API_MODE` | `mock`                                                    | `mock` serves everything from the in-app mock router, `live` hits the network |

Both are read in [app.config.ts](app.config.ts) into `extra` and then in [src/shared/api/config.ts](src/shared/api/config.ts). **Changing `.env` needs a Metro restart with cache clear (`npx expo start -c`).**

### HTTP client ([src/shared/api/client.ts](src/shared/api/client.ts))

- Every feature calls `apiClient.get/post/put/patch/delete`. Requests go through a `Transport`, which is `liveTransport` (`fetch`) or `mockTransport`, chosen by `API_MODE` ([transport/index.ts](src/shared/api/transport/index.ts)).
- Headers: `Content-Type: application/json` (omitted for multipart) plus `Authorization: Bearer <access>` unless `auth: false`.
- Tokens: SecureStore keys `coreo.auth.token` and `coreo.auth.refreshToken` ([authTokenStore.ts](src/shared/api/authTokenStore.ts)).
- Refresh: on a 401 for an authenticated call, the client POSTs `/users/token/refresh/` with `{refresh}`, stores the new `data.access`, and retries once. If refresh fails it clears the tokens.
- Errors: `ApiError` with kinds `network | unauthorized | validation | server | unknown`, mapped from the status code ([errors.ts](src/shared/api/errors.ts)). The raw body is kept in `.details`. TanStack Query does not retry unauthorized or validation errors, and retries other failures twice.

### Auth end to end

1. Register (`POST /users/register/`, from `SaveScreen`) or login (`POST /users/login/`, from [login.tsx](<src/app/(auth)/login.tsx>), which is currently unreachable) returns `{success, data:{user, tokens:{access, refresh}}}`.
2. `useSessionStore.signIn` writes both tokens to SecureStore and sets `status='signedIn'`.
3. `Stack.Protected` swaps `(auth)` for `(app)`.
4. Tokens last 60 minutes (access) and 7 days (refresh) per [docs/API_REFERENCE.md](docs/API_REFERENCE.md) §1.
5. After an app restart, `bootstrap()` treats an access token's _existence_ as "signed in" (it never validates it).

### Endpoints the app calls

Response envelope: users and core endpoints use "Style A" (`{success, data}`), while food, meals and meal-plans use bare payloads (see API_REFERENCE §2). Types live in `src/shared/types/*` and `src/features/*/schemas.ts`.

| Method | Path                                          | Called from                                                        | Notes                                                                                                         |
| ------ | --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/users/register/`                            | [authApi.ts](src/features/auth/api/authApi.ts)                     | auth:false. Sends email, password, `password_confirm`, first/last name, optional `date_of_birth` and `gender` |
| POST   | `/users/login/`                               | [authApi.ts](src/features/auth/api/authApi.ts)                     | auth:false. Only used by the unreachable login screen                                                         |
| POST   | `/users/token/refresh/`                       | [client.ts](src/shared/api/client.ts) (`refreshAccessToken`)       | Body `{refresh}`, reads `data.access`                                                                         |
| GET    | `/users/me/diet-profile/`                     | [dietProfileApi.ts](src/features/onboarding/api/dietProfileApi.ts) | `DietProfile`                                                                                                 |
| PUT    | `/users/me/diet-profile/`                     | [dietProfileApi.ts](src/features/onboarding/api/dietProfileApi.ts) | Partial patch sent via PUT                                                                                    |
| GET    | `/food/entries/?date=`                        | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | `FoodEntriesResponse`                                                                                         |
| POST   | `/food/entries/`                              | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | Create entry                                                                                                  |
| DELETE | `/food/entries/{id}/`                         | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      |                                                                                                               |
| GET    | `/food/search/?q=`                            | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | `FoodItem[]`                                                                                                  |
| GET    | `/food/lookup/barcode/{code}/`                | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | `FoodItem`                                                                                                    |
| POST   | `/food/photo/`                                | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | multipart, returns `PhotoEstimate`                                                                            |
| GET    | `/daily-summary/?date=`                       | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | `DailySummary`                                                                                                |
| PATCH  | `/daily-summary/water/`                       | [nutritionApi.ts](src/features/nutrition/api/nutritionApi.ts)      | `{water_ml}`                                                                                                  |
| POST   | `/meal-plans/`                                | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{date, plan_mode:'standard', regeneration_reason:''}`                                                        |
| GET    | `/meal-plans/{date}/`                         | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `MealPlanDetail`                                                                                              |
| POST   | `/meal-plans/{date}/regenerate/`              | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{regeneration_reason, plan_mode}`                                                                            |
| GET    | `/meal-plans/{date}/meals/{id}/recipe/`       | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `RecipeJson`, quota-limited                                                                                   |
| POST   | `…/meals/{id}/log/`                           | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | Optional `actual_calories`                                                                                    |
| POST   | `…/meals/{id}/skip/`                          | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        |                                                                                                               |
| POST   | `…/meals/{id}/adjust-quantity/`               | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{portion_multiplier}`                                                                                        |
| POST   | `…/meals/{id}/feedback/`                      | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{feedback_type, note?}`                                                                                      |
| POST   | `…/meals/{id}/replace/preview/`               | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{preference}` returns `ReplacePreviewResponse`                                                               |
| POST   | `…/meals/{id}/replace/confirm/`               | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{preview_token, chosen_index}`                                                                               |
| POST   | `/meal-plans/{date}/ate-something-else/`      | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        |                                                                                                               |
| GET    | `/meals/assistant-prompts/?context=meal_plan` | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        |                                                                                                               |
| POST   | `/meal-plans/{date}/assistant/`               | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        | `{prompt_option_id}`                                                                                          |
| POST   | `/meal-plans/{date}/assistant/confirm/`       | [mealPlanApi.ts](src/features/nutrition/api/mealPlanApi.ts)        |                                                                                                               |

**Documented in API_REFERENCE but not called by the app:** `/users/logout/`, profile get/update/delete, `/users/me/data/`, verify-email and verify-phone, password change and reset, `/exercise/*`, `/insights/*`, `/import/*`, `/core/config|stats|contact-support`. The feature-map marks fitness, wellness, insights and profile as later phases ([docs/feature-map.md](docs/feature-map.md)).

### Gotchas and fragile spots

1. **The default API mode is `mock`.** A fresh checkout never touches the backend. You must set `EXPO_PUBLIC_API_MODE=live`.
2. **The hardcoded ngrok URL appears in three places**: [app.config.ts](app.config.ts), [src/shared/api/config.ts](src/shared/api/config.ts) and [.env.example](.env.example). It is a free-tier ngrok tunnel, so it is likely ephemeral. It is also the fallback when the env var is unset. A real build with a forgotten env var silently targets that tunnel.
3. **`signOut` is never called anywhere**, and `/users/logout/` is never called. There is no sign-out UI and no server-side token blacklisting.
4. **There is no global 401 handling.** `queryClient.ts` says redirect-to-login "will hook in once auth flows exist". When refresh fails, the tokens are cleared but the `status` in the Zustand store stays `signedIn`, so the user is not routed out until restart.
5. **Refresh races:** parallel 401s each trigger their own refresh (no single-flight lock). Refresh also ignores any rotated `refresh` token in the response, and it reads only `data.access`.
6. **`ApiError.fromResponse` maps both 401 and 403 to "unauthorized"**, and the refresh retry only runs on 401. A quota error shape exists (API_REFERENCE §16) and is handled in `features/nutrition/lib/quotaError.ts`.
7. **`bootstrap()` trusts any stored access token** without checking expiry, so the first request after a long gap relies on the refresh path.
8. **Mixed response envelopes** (Style A vs Style B) mean each API module parses its own shape. `authApi.ts` has defensive error extraction across several shapes.
9. **Some URLs build query strings by hand** (`?date=${date}`, `?context=${context}`), and only some are `encodeURIComponent`-ed.
10. **`EXPO_PUBLIC_*` values are public** and are baked into the bundle.
11. **Docs and config disagree on the React Compiler.** [app.config.ts](app.config.ts) enables `experiments.reactCompiler: true`, but the ESLint comment in [eslint.config.js](eslint.config.js) says "This project doesn't opt into the React Compiler".
12. **The `postinstall` runs `patch-package`** ([patches/expo-modules-jsi+57.0.3.patch](patches/expo-modules-jsi+57.0.3.patch)). It must keep matching the pinned version of `expo-modules-jsi`.
13. **The mock layer is substantial** (`src/shared/api/mock/*`, `features/*/mocks/*`). A new endpoint needs a mock handler plus a call, and mock behaviour can drift from the real Django behaviour.

## Running locally

### Prerequisites

- Node (Expo 57 supports current LTS releases; there is no `.nvmrc` yet) and npm.
- iOS: Xcode with an iOS simulator, plus CocoaPods and Watchman (`brew install cocoapods watchman`).
- Android: JDK 17 (`brew install --cask zulu@17`), the Android SDK, and an emulator (AVD).

### Commands

```bash
npm install                 # triggers patch-package postinstall; hooks install via husky
cp .env.example .env        # then edit, see below
npx expo run:ios            # first build compiles native code (slow); creates ios/ (gitignored)
npx expo run:android        # needs JDK + an AVD
npx expo start --dev-client # later runs, once a dev build is installed
npx expo start --web        # quick smoke test only
npm run lint && npm run typecheck && npm run format:check
```

### Mock mode (works with no backend)

Leave `EXPO_PUBLIC_API_MODE=mock`. Auth and data are served by the in-app mock router.

### Pointing at your local Django backend

Run your local Django backend on `0.0.0.0:8000` and make sure `ALLOWED_HOSTS` allows the host. Then set `.env`:

```
EXPO_PUBLIC_API_MODE=live
# iOS simulator / web:
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
# Android emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
# Physical device (same Wi-Fi), use your Mac's LAN IP:
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1
```

Restart with `npx expo start -c`. **Plain `http://` needs a cleartext exception:** iOS blocks non-HTTPS by default (App Transport Security allows `localhost` in debug in some setups, but not LAN IPs), and Android 9+ blocks cleartext unless enabled. [app.config.ts](app.config.ts) has neither, so you may need `usesCleartextTraffic` (Android) and an ATS exception (iOS), or an `ngrok`/`cloudflared` HTTPS tunnel to your local server. The `/api/v1` prefix is assumed from the existing default URL, so confirm it matches your Django `urls.py`. CORS does not apply to native, but it does if you use web.

## Good first tasks

1. **Add a minimal GitHub Actions workflow** running `npm ci`, `npm run lint`, `npm run typecheck` and `npm run format:check`. Low risk, and it needs no app changes.
2. **Fix the refresh and sign-out plumbing** in [src/shared/api/client.ts](src/shared/api/client.ts) and [sessionStore.ts](src/features/auth/store/sessionStore.ts): add a single-flight refresh, flip the session to `signedOut` when refresh fails, and add a `signOut` that calls `/users/logout/`.
3. **Add `.nvmrc` and `engines`**, and add a `.env.example` note on per-platform local URLs (localhost, `10.0.2.2`, LAN IP). Add the Android and iOS cleartext config if the team agrees.
4. **Centralise the default API URL** (remove the duplicate in [app.config.ts](app.config.ts), and fail loudly in `live` mode when `EXPO_PUBLIC_API_URL` is missing), and `encodeURIComponent` the hand-built query params.
5. **Unit tests for pure logic** (`resolveLaunchDestination`, `estimateDailyTargets`, `macros.ts`, `ApiError.fromResponse`). This needs Jest set up first, so confirm with the team first (CLAUDE.md §7).
