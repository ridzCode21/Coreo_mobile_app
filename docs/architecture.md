# Architecture

Technical architecture for the app. This is the doc `.agent/skills/react-native-architecture`
points to. Keep it in sync as real decisions are made — if you deviate from something here,
update this file in the same change.

## 1. Guiding principles

1. **Feature-based, not type-based.** Group by domain (`workouts`, `nutrition`, `auth`), not by
   technical layer (`components`, `screens`, `hooks` at the top level).
2. **Routes are thin.** `app/` (Expo Router) contains only route wiring — layout, params,
   redirects. Real screen logic lives in `src/features/*` and is imported into the route file.
3. **One way to hold each kind of state.** Server data → TanStack Query. Small global client
   state → Zustand. Form state → React Hook Form. Never two tools for the same job.
4. **Colocate, then extract.** New code starts inside its feature folder. Only move something
   into `src/shared` once a second feature needs it.

## 2. Top-level layout

```
app/                          # Expo Router — file-based routes, typed routes enabled
  _layout.tsx                 # Root layout: providers, fonts, splash handling
  (auth)/
    login.tsx
    sign-up.tsx
    _layout.tsx
  (app)/                      # authenticated area
    (tabs)/
      index.tsx                # e.g. Home/Dashboard
      workouts.tsx
      nutrition.tsx
      profile.tsx
      _layout.tsx
    workout/[id].tsx
    _layout.tsx

src/
  features/
    auth/
      api/                    # query/mutation hooks calling the API layer
      components/             # feature-local UI
      screens/                # screen-level components rendered by app/ routes
      store/                  # feature-local Zustand slice, if any
      schemas.ts              # Zod schemas for this feature's forms/data
      types.ts
      index.ts                # public exports — other features import only from here
    workouts/
    nutrition/
    profile/
    onboarding/

  shared/
    api/
      client.ts                # single fetch/axios instance, base URL, interceptors
      queryClient.ts            # TanStack QueryClient instance + default options
      errors.ts                 # normalized API error shape + helpers
    components/                 # design-system primitives (Button, Text, Card, Screen, ...)
    hooks/                      # cross-feature hooks (useDebounce, useAppState, ...)
    lib/
      secureStorage.ts          # thin wrapper around expo-secure-store
      storage.ts                # non-sensitive persisted storage (e.g. MMKV/AsyncStorage)
    stores/                     # app-wide Zustand stores (session, app-settings)
    theme/                       # design tokens consumed from docs/design-system.md
    types/                       # shared TypeScript types
    utils/                       # pure helper functions
    constants/

assets/                         # fonts, images, lottie files
app.config.ts                   # Expo config as code (env-aware)
eas.json                        # EAS build/submit profiles (added when app is scaffolded)
```

### Import rules

- A feature may import from `src/shared/*` and from another feature's `index.ts` (its public
  surface) — never reach into another feature's internal files (`features/workouts/components/X`
  from outside `workouts`).
- `app/*` route files import from `src/features/*/screens` only. No business logic in `app/*`.
- Use path aliases (`@/features/*`, `@/shared/*`) instead of long relative paths; configure in
  `tsconfig.json` once the project is scaffolded.

## 3. State management decision table

| Kind of state | Tool | Notes |
|---|---|---|
| Data from an API (workouts, profile, plans, feed) | **TanStack Query** | One query-hook per resource in `features/*/api`. Use query key factories per feature. Mutations invalidate the relevant keys. |
| Small global client/UI state (active theme, onboarding step, auth session flags, feature flags) | **Zustand** | Keep stores small and focused; one store per concern, not one giant app store. Never put server-fetched data here. |
| Form input + validation | **React Hook Form + Zod** | Define the Zod schema once per form in `schemas.ts`; reuse it for both `zodResolver` and typing the submit payload. |
| Auth tokens / refresh tokens / small secrets | **expo-secure-store** | Never in Zustand, AsyncStorage, or component state. Access only through `shared/lib/secureStorage.ts`. |
| Ephemeral local UI state (input focus, modal open) | `useState`/`useReducer` | Local to the component, not global. |
| Derived data | Plain functions/selectors | Don't duplicate into another store; compute from source of truth. |

If you're unsure which bucket something falls into, default to: is it something the server
knows about? → Query. Otherwise, is more than one feature/screen going to read it right now? →
Zustand. Otherwise → local state.

## 4. Networking layer

- Single HTTP client in `shared/api/client.ts`. All feature API modules call through it — no
  feature creates its own `fetch`/axios instance.
- Request interceptor attaches the auth token read from `secureStorage`.
- Response/error interceptor normalizes errors into a shared `ApiError` shape (`shared/api/errors.ts`)
  so UI code can branch on a consistent structure (network vs. 4xx vs. 5xx vs. validation).
- TanStack Query's `QueryClient` (in `shared/api/queryClient.ts`) owns retry/backoff, stale time,
  and global error handling (e.g. redirect to login on 401).

## 5. Navigation

- Expo Router, typed routes enabled (`experiments.typedRoutes` in `app.json`/`app.config.ts`)
  once the app is scaffolded.
- Route groups: `(auth)` for unauthenticated flow, `(app)` for authenticated flow with its own
  `(tabs)` group. Root layout decides which group to render based on session state from the auth
  Zustand store.
- Deep links validated at the boundary (don't trust params blindly — parse/validate with Zod
  before use, same as any external input).

## 6. Native/runtime configuration

- **New Architecture** enabled from the start (`newArchEnabled: true` in Expo config) — don't
  add libraries that require legacy-architecture opt-out.
- **Development builds** (`expo-dev-client`), not Expo Go, once native modules (SecureStore,
  Sentry later, etc.) are in play.
- Environment config via `app.config.ts` reading `process.env`, with EAS secrets for
  build-time values in non-local environments. Never commit real secrets — `.env` is
  git-ignored, `.env.example` documents required keys.

## 7. Error handling & observability (designed for, not wired up yet)

- Centralize error boundaries: one at the root layout, optionally one per major route group.
- All thrown/caught errors flow through a single `reportError()` seam in `shared/lib` — today it
  can just log; when Sentry is added (deferred, see `AGENTS.md` §7) it's a one-file change.
- Query/mutation errors surface through the normalized `ApiError` shape, not raw
  axios/fetch errors, so UI and future crash reporting see consistent data.

## 8. Release pipeline (EAS) — overview

Configured once the app is scaffolded; noted here so features are built compatibly:

- **Build**: `development`, `preview`, `production` profiles in `eas.json`.
- **Update**: EAS Update for JS-only hotfixes on top of a build.
- **Submit**: EAS Submit for store delivery.
- **Workflows**: EAS Workflows for CI-style build/test/submit automation once testing is wired
  in.
