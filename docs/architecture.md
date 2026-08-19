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
    _layout.tsx                  # Root layout: providers (Query/SafeArea/Gesture), fonts, flags
                                  # hydration, then (public) always mounted + Stack.Protected
                                  # auth-gate between (auth) and (app) — see §5
    (public)/                    # pre-auth, ungated — always mounted regardless of session state
      _layout.tsx
      splash.tsx                 # → features/splash — first screen on every cold start; also
                                  # resumes an in-progress onboarding draft (see §5.1)
      first-open.tsx              # → features/onboarding — new-user landing (20a/24a)
      onboarding/                 # → features/onboarding — value-first, signup-last interview
                                  # (onboarding-v2-flow-plan.md): name → goal → about-you → gender
                                  # → pillars → diet interview → promise → calibrating → save (last)
        _layout.tsx                # (register/`save.tsx` is the LAST step, not the first — see §5)
        name.tsx, about-you.tsx, gender.tsx, pillars.tsx, promise.tsx, save.tsx
        diet/                      # goal + D1–D10 diet interview questions + calibrating — see §5.1
                                    # (lives in (public) purely for nav continuity — see §5)
          _layout.tsx
          [step].tsx                 # one dynamic route → DietQuestionScreen, driven by
                                    # dietQuestions.ts (config-driven, not one file per question)
          calibrating.tsx           # → CalibratingScreen (wave-progress completeness screen,
                                    # computed from the local draft, no API call)
    (auth)/
      _layout.tsx
      login.tsx                  # ← unreachable from any flow today (F1, feature-map.md); the
                                  # design's only sign-up/sign-in moment is 8a inside onboarding
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
    splash/                      # animated wave-logo intro — see implementation-plan.md §5
      components/                # AnimatedSplash (Reanimated + SVG draw-in)
      screens/                   # SplashScreen — decides + navigates to the next destination
      lib/                       # resolveLaunchDestination — pure routing-decision function
    onboarding/                  # value-first, signup-last interview (v2) — see §5.1
      screens/                   # FirstOpenScreen, Name/AboutYou/Gender/Pillars/Promise/
                                  # SaveScreen, DietQuestionScreen (goal + D1–D10), CalibratingScreen
      store/                      # onboardingStore — the draft, `persist`-backed by AsyncStorage
                                  # (survives app kill so an interrupted interview can resume —
                                  # see §5), incl. `dietProfile` sub-draft and `lastCompletedStep`
      lib/                        # steps (THE unified sequencer — every step, bespoke + diet-config,
                                  # in one ordered list, §5.1), dietQuestions (diet question config),
                                  # resolveGoalType (fallback-only, goal_type is now a direct
                                  # question), estimateDailyTargets, dietProfileCompleteness
      api/                        # dietProfileApi — useDietProfileQuery/useUpdateDietProfileMutation;
                                  # the mutation now fires exactly once, from SaveScreen, right after
                                  # register succeeds (no more per-question PUTs during the interview)
      mocks/                      # dietProfile.handlers — mock GET/PUT /users/me/diet-profile/
      schemas.ts                  # Zod dietProfilePatchSchema, freeFoodEntrySchema
      components/                 # OnboardingStepScaffold, NextBar, SliderRow, ToggleRow, etc.
    workouts/                    # not yet created — added when that feature is planned/built
    nutrition/                   # Layer 1 built: food logging + calorie/macro tracking
      api/                       # nutritionApi — food entries/search/barcode/photo + daily-summary
                                  # query/mutation hooks + nutritionKeys factory (§8/§10)
      screens/                   # DietHomeScreen (14a, temporary (app) landing), ConfirmMealScreen (15a)
      components/                # MacroSummaryCard, LogMealSheet, LoggingOptionTile, FoodEntryRow, FoodSearchList
      lib/                       # macros (pure budget/grouping helpers), photoCapture (expo-image-picker, isolated)
      mocks/                     # handlers (§8 food + §10 daily-summary) + fixtures (seed food DB + starter day)
      schemas.ts                 # Zod: confirm/manual entry + confirm route params
      index.ts                   # public surface
      # Layer 2 (pending): meal plans (§12), meal actions (§13), assistant (§14)
    profile/

  shared/
    api/
      client.ts                  # single client every feature calls; dispatches via `transport`
      transport/                 # live vs. mock seam — see §4
        index.ts                 # picks live/mock from EXPO_PUBLIC_API_MODE
        liveTransport.ts         # the real fetch() path
        mockTransport.ts         # routes into shared/api/mock instead of the network
        types.ts
      mock/                      # in-app mock backend — see §4 and implementation-plan.md §2
        router.ts                # registerMock/resolveMock — pattern-matched handler registry
        db.ts                    # in-memory seeded store, grows per-feature
        envelope.ts               # Style A / Style B response helpers (API_REFERENCE.md §2)
        tokens.ts                # mock JWT-shaped access/refresh issuance + blacklist
      queryClient.ts             # TanStack QueryClient instance + default options
      errors.ts                  # normalized ApiError shape + helpers
    components/
      GlassCard.tsx               # the liquid-glass material primitive (design-system.md §4)
      Screen.tsx                  # safe-area + scroll + responsive-width screen wrapper
      WaveMark.tsx                # the wave logo/wordmark primitive (design-system.md §7)
      WaveChart.tsx                # signature wave primitive — solid/dashed/glow-dot/area fill,
                                  # animated (design-system.md §6.1); onboarding Reading/Promise/
                                  # Save/Calibrating today, home "today" card later
      ProgressDots.tsx             # onboarding step indicator, now parameterized per flow (§3)
      ToggleRow.tsx                 # full-width selectable row; selectionMode: radio | check
      SelectableChip.tsx           # goal/diet-interview selection pill
      PrimaryIconButton.tsx        # the one circular primary action per screen
    hooks/
      useResponsive.ts            # breakpoint/orientation (design-system.md §11.4)
      useOrientationLock.ts        # explicit per-screen portrait lock (design-system.md §11.3)
    lib/
      secureStorage.ts            # thin wrapper around expo-secure-store — tokens only
      storage.ts                  # thin wrapper around AsyncStorage — non-sensitive flags only
    stores/
      appFlagsStore.ts             # small app-wide client flags (e.g. hasSeenFirstOpen)
    theme/
      tokens.ts                   # colors/spacing/radii/typography — mirrors design-system.md;
                                    # also exports `textStyle()` to resolve the right Poppins
                                    # font file per weight (RN needs fontFamily, not fontWeight,
                                    # for custom static fonts)
    types/                        # shared TypeScript types
    utils/                        # pure helper functions
    constants/

assets/                          # icons/splash (placeholder branding — real assets pending)
app.config.ts                    # Expo config as code (env-aware)
eas.json                         # EAS build/submit profiles — not yet created, separate task
```

### Import rules

- A feature may import from `src/shared/*` and from another feature's `index.ts` (its public
  surface) — never reach into another feature's internal files (`features/workouts/components/X`
  from outside `workouts`).
- `src/app/*` route files import from `src/features/*` only. No business logic in `src/app/*`.
- Path aliases: `@/*` → `./src/*` (configured in `tsconfig.json`), so `@/features/auth` and
  `@/shared/theme/tokens` resolve directly — use these instead of long relative paths.

## 3. State management decision table

| Kind of state                                                                                                             | Tool                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data from an API (workouts, profile, plans, feed)                                                                         | **TanStack Query**                                                     | One query-hook per resource in `features/*/api`. Use query key factories per feature. Mutations invalidate the relevant keys.                                                                                                                                                                                                                                                                        |
| Small global client/UI state (active theme, onboarding step, auth session flags, feature flags)                           | **Zustand**                                                            | Keep stores small and focused; one store per concern, not one giant app store. Never put server-fetched data here.                                                                                                                                                                                                                                                                                   |
| Form input + validation                                                                                                   | **React Hook Form + Zod**                                              | Define the Zod schema once per form in `schemas.ts`; reuse it for both `zodResolver` and typing the submit payload.                                                                                                                                                                                                                                                                                  |
| Auth tokens / refresh tokens / small secrets                                                                              | **expo-secure-store**                                                  | Never in Zustand, AsyncStorage, or component state. Access only through `shared/lib/secureStorage.ts`.                                                                                                                                                                                                                                                                                               |
| Small **non-sensitive** persisted flags (first-run, UI preferences)                                                       | **Zustand store hydrated from `shared/lib/storage.ts` (AsyncStorage)** | e.g. `shared/stores/appFlagsStore.ts`'s `hasSeenFirstOpen`. The store is the read API; `storage.ts` is only touched inside the store's `hydrate`/setter actions, not from components directly.                                                                                                                                                                                                       |
| A multi-screen draft that must survive an app kill before it has a server home (e.g. the pre-signup onboarding interview) | **Zustand `persist` middleware, `AsyncStorage`-backed**                | `features/onboarding/store/onboardingStore.ts` — `partialize`d to just `{draft, lastCompletedStep}`, `onRehydrateStorage` flips a `hasHydrated` flag `SplashScreen` waits on before deciding where to route. Not a general pattern for server data — this exists only because the v2 flow collects a full profiling interview _before_ an account exists to save it to (onboarding-v2-flow-plan.md). |
| Ephemeral local UI state (input focus, modal open)                                                                        | `useState`/`useReducer`                                                | Local to the component, not global.                                                                                                                                                                                                                                                                                                                                                                  |
| Derived data                                                                                                              | Plain functions/selectors                                              | Don't duplicate into another store; compute from source of truth.                                                                                                                                                                                                                                                                                                                                    |

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

### Mock API layer (`EXPO_PUBLIC_API_MODE`)

There's no live backend yet, but a real one's contract exists (`API_REFERENCE.md`). Rather than
write feature code against an imaginary API and rewrite it later, `client.ts` dispatches every
request through a swappable `transport` strategy (`shared/api/transport/index.ts`), picked once at
boot from `EXPO_PUBLIC_API_MODE` (`mock` default in dev, `live` = the real `fetch` path). The
exported `apiClient` is built by `createApiClient({ config, transport, tokenStore })`, so tests
and future app surfaces can inject a different strategy/token store without feature-code changes:

- `mockTransport` matches `method + path` against `shared/api/mock/router.ts`'s registry and
  returns a Response-like object — feature code and `client.ts` can't tell the difference from a
  real network response.
- Each feature registers its own mock endpoints in `features/<feature>/mocks/handlers.ts`
  (colocated with the feature, imported once so it self-registers) using fixtures shaped exactly
  like the real `API_REFERENCE.md` objects.
- `shared/api/mock/db.ts` is the in-memory store those handlers read/write; `envelope.ts` wraps
  responses in the correct shape — API_REFERENCE.md §2 documents **two incompatible envelope
  styles** (Style A wrapped `{success,data}` for users/core; Style B bare payload for
  food/exercise/insights/meals) and handlers must match whichever the real route uses.
- `shared/api/mock/tokens.ts` issues "real-shaped" (three-segment, base64url) mock access/refresh
  tokens with the same claims the real JWT carries, so the 401→refresh→retry flow (once built,
  Phase 2) is exercised against realistic tokens, not a stub string.
- Flipping to `live` (env var, or later a build profile default) requires zero feature-code
  changes — that's the point of the seam being at `client.ts`, not scattered per-feature. Local
  live development currently points at `https://vesselled-maxton-ringlike.ngrok-free.dev/api/v1`
  via `EXPO_PUBLIC_API_URL`.
- The client owns the auth-token dependency and refresh flow: protected requests attach the
  SecureStore access token; a single 401 retry calls `/users/token/refresh/`, stores the new
  access token, and replays the original request once. If refresh fails, both tokens are cleared.

See `implementation-plan.md` §2/§3 for the full rationale and the auth-specific reconciliation
plan (mock-backed now, real contract from day one).

## 5. Navigation

- Expo Router, typed routes enabled (`experiments.typedRoutes` in `app.config.ts`).
- Three route groups under the root `Stack`:
  - `(public)` — always mounted, never gated. Holds `splash` (the true first screen on every cold
    start), `first-open` (new-user landing), and `onboarding/*` — the **entire** value-first
    interview (name → goal → about-you → gender → pillars → diet questions → promise →
    calibrating), with
    account creation (`save.tsx`, 8a) as the _last_ step, not the first
    (onboarding-v2-flow-plan.md's "signup-last" shift — previously register happened mid-flow).
    Splash reads session state _and_ the persisted onboarding draft, then calls
    `router.replace(...)` to the right destination once its animation + minimum display time have
    both finished (`features/splash/lib/resolveLaunchDestination.ts`) — see `implementation-plan.md`
    §5. Every signed-out user (first-time or returning) lands on `first-open` or resumes
    mid-interview, never `(auth)`: the design has no standalone return-user login screen (see F1,
    `feature-map.md`). `first-open`'s "Begin" CTA drops straight into `onboarding/name`.
  - **Resume rule:** if a signed-out user has a persisted draft with `lastCompletedStep` set
    (they closed the app mid-interview), splash sends them to
    `firstUnansweredFlowStep(lastCompletedStep, draft)` (`features/onboarding/lib/steps.ts`)
    instead of `first-open`, so they pick up exactly where they left off rather than restarting.
  - `(auth)` / `(app)` — each wrapped in `<Stack.Protected guard={...}>`, gated on session state
    from `useSessionStore` (auth feature) — Expo Router's supported pattern for auth flows, rather
    than a manual redirect-in-effect. `Stack.Protected`'s guard only controls which group is
    _mountable_; it doesn't auto-navigate you into a newly unlocked group, so `onboarding/save.tsx`
    (8a, now the flow's last screen) explicitly drives the handoff: it calls `useSessionStore`'s
    `signIn(tokens)` on successful register, fires the **single** whole-draft
    `PUT /users/me/diet-profile/` (built from the entire local draft, not per-question anymore),
    clears the onboarding draft, and only then `router.replace('/(app)')`s — with a retry affordance
    if that one PUT fails after the account already exists (account creation isn't rolled back).
    `(app)` is a plain `Stack.Screen`, not a tab/drawer navigator yet — a `(tabs)`/petal-cluster
    layout is added when that navigation feature is actually built (see design-system.md §8) —
    today `(app)` has a single stub screen. `(auth)`'s `login.tsx` is currently unreachable from any
    navigation path (F1, resolved for now — see `feature-map.md`); it stays in the tree as scaffold
    for whenever a real login screen is designed.
  - `(public)` vs. `(app)` is a **navigation** boundary, not an **auth-requirement** boundary —
    don't assume everything under `(public)` is anonymous. Once `save.tsx` has signed the user in,
    the tail end of that same screen's work (the diet-profile PUT) makes a real authenticated call
    while the user is technically still on a `(public)` route (F8, `feature-map.md`) — the bearer
    token is attached by `shared/api/client.ts` regardless of which route group is currently
    mounted. If a screen needs actual gating (redirect-if-signed-out), that's still a
    `Stack.Protected` decision independent of this one.
- **First-run vs. onboarding-in-progress vs. onboarding-complete are three different facts, don't
  conflate them:** `hasSeenFirstOpen` (`shared/stores/appFlagsStore.ts`) decides "has this device
  ever seen the app". The persisted onboarding draft (`onboardingStore`'s `lastCompletedStep`,
  above) decides "is there an interview in progress on this device, pre-signup". Both are
  **client-side, pre-auth** facts. Post-signup completeness (whether an authenticated user still
  has an incomplete diet profile) is a _server_ fact (`diet-profile.onboarding_complete`,
  API_REFERENCE.md §5) — in the v2 flow this should be unreachable in practice (the whole interview
  is collected locally before the account, and only one account, exists to be incomplete), so
  there is deliberately no `(app)`-entry gate built for it yet. Revisit if a future path lets a
  signed-in user reach `(app)` without having finished the local draft first (e.g. a future "skip
  for now" escape hatch).
- Per-screen orientation policy is explicit, not implicit (design-system.md §11.3): `splash` and
  `first-open` lock portrait via `shared/hooks/useOrientationLock.ts`; longer-lived screens
  (Home, chat, lists) must not lock and should be left to rotate freely.
- Deep links validated at the boundary (don't trust params blindly — parse/validate with Zod
  before use, same as any external input).

### 5.1 Config-driven multi-step flows (pattern)

Two related mechanisms, both under `features/onboarding/lib/`, that together own the **entire**
onboarding interview as one sequence (onboarding-v2-flow-plan.md's "unified sequencer" — this
replaced an earlier design with two independent sequencers, one for core setup and one for the
diet interview, which made "what screen comes after X" a two-places-to-check question):

- **`steps.ts`** — the single source of truth for the whole flow. `FLOW_STEP_IDS` is one ordered
  array interleaving bespoke screens (`name`, `about-you`, `gender`, `pillars`, `promise`) with every
  diet-interview question id from `dietQuestions.ts` (including `goal`, now asked directly rather
  than derived), ending in the two dot-less terminal steps `calibrating` and `save`. Exposes:
  `flowStepRoute` (step id → `Href`, routing bespoke ids to their own screen and every diet-config
  id through the one generic `onboarding/diet/[step]` route), `isFlowStepVisible` /
  `flowStepProgress` (the flow's only conditional skip today — the target-weight slider only shows
  for weight-related goals — and the resulting progress-dot count/index, both computed against the
  live draft so a skipped step never reserves a dot), `nextFlowStep` (pure "what comes after this
  step", skipping anything `isFlowStepVisible` rules out), and `firstUnansweredFlowStep` (resume
  support — see §5). Every screen calls `completeStep(id)` on the `onboardingStore` and then
  `nextFlowStep`/`flowStepRoute` to advance; no screen hardcodes what follows it.
- **`dietQuestions.ts`** — still the config array for the diet-interview portion specifically: an
  ordered `DietQuestion[]` declaring each question's id, API field, input `kind`
  (`single | multi | slider | mockOnly`), copy (a string, or a function of the user's name for
  personalized titles like the `goal` question), and options. One generic screen
  (`DietQuestionScreen`) reads the current question by route param and renders the right shared
  input component (`ToggleRow` / `SelectableChip` / `SliderRow`), writing straight to the local
  draft — no per-question API calls (see below). This file no longer exports its own
  sequencing/progress helpers; `steps.ts` owns all of that now.
- **When to use which:** reach for a `dietQuestions.ts`-style config array whenever a run of
  screens is structurally identical (same scaffold, differing only in copy/options/field) — likely
  true for the fitness/wellness interviews (F2, `feature-map.md`) when they're built, which should
  plug their own question ids into `FLOW_STEP_IDS` the same way. Reach for a bespoke screen +
  `steps.ts` entry when a step genuinely differs in layout/composition (name entry, the age/
  height/weight sliders on "about you", a dedicated single-question `gender` chip screen,
  multi-select pillars, the register form — one generic renderer wouldn't fit). Note `gender` is
  a _separate_ bespoke screen from `about-you` even though both are simple selection/slider
  inputs — combining a 4th input into `about-you` didn't fit the shared scaffold's "question near
  the top, answer near the bottom" layout cleanly, so it got its own step instead of being forced
  into an existing one; see `features/onboarding/lib/steps.ts`'s docblock.
- **One commit, not one PUT per question:** earlier builds called
  `useUpdateDietProfileMutation` after every answered question. The v2 flow collects the _entire_
  interview into the local draft first and fires exactly one `PUT /users/me/diet-profile/` from
  `SaveScreen`, immediately after registration succeeds — see §5's `save.tsx` description. This is
  why `DietQuestionScreen` and `CalibratingScreen` no longer call `useDietProfileQuery`/the update
  mutation at all during the interview; they read/derive everything from `onboardingStore`'s draft.

## 6. Native/runtime configuration

- **New Architecture** — as of Expo SDK 57 / RN 0.86 this is the only architecture; there's no
  `newArchEnabled` flag to set and no legacy fallback to worry about breaking.
- **Development builds** (`expo-dev-client` is installed) — don't develop against Expo Go once
  you're touching native modules (SecureStore, blur, later Sentry).
- Environment config via `app.config.ts` reading `process.env` (`EXPO_PUBLIC_API_URL`,
  `EXPO_PUBLIC_API_MODE` — see §4), with EAS secrets for build-time values in non-local
  environments. Never commit real secrets — `.env` is git-ignored, `.env.example` documents
  required keys.

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
