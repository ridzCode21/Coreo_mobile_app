# Architecture

Technical architecture for the app. This is the doc `.agent/skills/react-native-architecture`
points to. Keep it in sync as real decisions are made — if you deviate from something here,
update this file in the same change.

## 1. Guiding principles

1. **Feature-based, not type-based.** Group by domain (`workouts`, `nutrition`, `auth`), not by
   technical layer (`components`, `screens`, `hooks` at the top level).
2. **Routes are thin.** `src/app/` (Expo Router) contains only route wiring — layout, params,
   redirects. Real screen logic lives in `src/features/*` and is imported into the route file.
3. **One way to hold each kind of state.** Server data → TanStack Query. Small global client
   state → Zustand. Form state → React Hook Form. Never two tools for the same job.
4. **Colocate, then extract.** New code starts inside its feature folder. Only move something
   into `src/shared` once a second feature needs it.

## 2. Top-level layout

Scaffolded as of `feature/app-scaffold` (Expo SDK 57, RN 0.86). Routes live under `src/app/`, not
a root-level `app/` — Expo Router's own current template convention, and it keeps everything
app-related under `src/` with only config/docs at the repo root:

```
src/
  app/                          # Expo Router — file-based routes, typed routes enabled
    _layout.tsx                  # Root layout: providers (Query/SafeArea/Gesture), fonts, splash,
                                  # Stack.Protected auth-gate between (auth) and (app)
    (auth)/
      _layout.tsx
      login.tsx                  # ← real screens/visual design are feature work, see §1.4
    (app)/                       # authenticated area
      _layout.tsx
      index.tsx                  # Home stub today; will grow (tabs)/ or the petal-cluster
                                  # layout once that navigation feature is built (design-system.md §8)
      # workout/[id].tsx, etc. — added per-feature as they're built

  features/
    auth/                        # scaffolded: session store, login schema, login mutation
      api/                       # query/mutation hooks calling the API layer
      components/                # feature-local UI
      store/                     # feature-local Zustand slice (sessionStore)
      schemas.ts                 # Zod schemas for this feature's forms/data
      index.ts                   # public exports — other features import only from here
    workouts/                    # not yet created — added when that feature is planned/built
    nutrition/
    profile/
    onboarding/

  shared/
    api/
      client.ts                  # single fetch instance, base URL, auth header, error normalization
      queryClient.ts             # TanStack QueryClient instance + default options
      errors.ts                  # normalized ApiError shape + helpers
    components/
      GlassCard.tsx               # the liquid-glass material primitive (design-system.md §4)
      Screen.tsx                  # safe-area + scroll + responsive-width screen wrapper
    hooks/
      useResponsive.ts            # breakpoint/orientation (design-system.md §11.4)
    lib/
      secureStorage.ts            # thin wrapper around expo-secure-store
    theme/
      tokens.ts                   # colors/spacing/radii/typography — mirrors design-system.md
    types/                        # shared TypeScript types
    utils/                        # pure helper functions
    constants/

assets/                          # icons/splash (placeholder branding — real assets pending)
app.config.ts                    # Expo config as code (env-aware)
eas.json                         # EAS build/submit profiles — not yet created, separate task
```

Not yet created, added on demand: `shared/stores/` (only if an app-wide Zustand store is needed
beyond feature-local ones), `shared/lib/storage.ts` (non-sensitive persisted storage, if/when
needed).

### Import rules

- A feature may import from `src/shared/*` and from another feature's `index.ts` (its public
  surface) — never reach into another feature's internal files (`features/workouts/components/X`
  from outside `workouts`).
- `src/app/*` route files import from `src/features/*` only. No business logic in `src/app/*`.
- Path aliases: `@/*` → `./src/*` (configured in `tsconfig.json`), so `@/features/auth` and
  `@/shared/theme/tokens` resolve directly — use these instead of long relative paths.

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

- Expo Router, typed routes enabled (`experiments.typedRoutes` in `app.config.ts`).
- Route groups: `(auth)` for unauthenticated flow, `(app)` for authenticated flow. The root
  layout (`src/app/_layout.tsx`) renders both groups wrapped in `<Stack.Protected guard={...}>`,
  gated on session state from `useSessionStore` (auth feature) — Expo Router's supported pattern
  for auth flows, rather than a manual redirect-in-effect. A `(tabs)`/petal-cluster layout inside
  `(app)` is added when that navigation feature is actually built (see design-system.md §8) —
  today `(app)` has a single stub screen.
- Deep links validated at the boundary (don't trust params blindly — parse/validate with Zod
  before use, same as any external input).

## 6. Native/runtime configuration

- **New Architecture** — as of Expo SDK 57 / RN 0.86 this is the only architecture; there's no
  `newArchEnabled` flag to set and no legacy fallback to worry about breaking.
- **Development builds** (`expo-dev-client` is installed) — don't develop against Expo Go once
  you're touching native modules (SecureStore, blur, later Sentry).
- Environment config via `app.config.ts` reading `process.env` (currently just
  `EXPO_PUBLIC_API_URL`), with EAS secrets for build-time values in non-local environments. Never
  commit real secrets — `.env` is git-ignored, `.env.example` documents required keys.

## 7. Error handling & observability (designed for, not fully wired up yet)

- Centralize error boundaries: one at the root layout, optionally one per major route group —
  not yet added.
- `shared/api/errors.ts`'s `ApiError` is the normalized shape all query/mutation errors surface
  through today. A single `reportError()` seam (still to add, in `shared/lib`) will be the one
  file that changes when Sentry lands (deferred, see `AGENTS.md` §7).

## 8. Release pipeline (EAS) — overview

Not yet configured (`eas.json` doesn't exist yet — separate task from app scaffolding); noted
here so features are built compatibly with the intended pipeline:

- **Build**: `development`, `preview`, `production` profiles in `eas.json`.
- **Update**: EAS Update for JS-only hotfixes on top of a build.
- **Submit**: EAS Submit for store delivery.
- **Workflows**: EAS Workflows for CI-style build/test/submit automation once testing is wired
  in.
