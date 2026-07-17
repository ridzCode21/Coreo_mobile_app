---
name: react-native-architecture
description: >-
  Decide where new code belongs and which state tool to use in this Expo/React Native app —
  feature-based folder placement, TanStack Query vs. Zustand vs. RHF, Expo Router conventions,
  New Architecture and SecureStore rules. Use before writing files for any feature, and whenever
  unsure where something goes.
disable-model-invocation: true
---

# React Native Architecture

Full reference: [`docs/architecture.md`](../../../docs/architecture.md). This skill is the quick
decision checklist; read the full doc for detail/rationale.

## Instructions

Before creating files, answer these in order:

1. **Which feature owns this?** If it's clearly one domain (`workouts`, `nutrition`, `auth`,
   `profile`, `onboarding`), it goes in `src/features/<that>/`. If it's genuinely needed by 2+
   features already, it goes in `src/shared/`. Don't pre-emptively shared-ify something only one
   feature currently uses.
2. **Is this a route or a screen?** Route wiring (params, layout, redirects) → `src/app/`. Actual
   UI and logic → `src/features/<feature>/` (a `screens/` subfolder once a feature has more than
   1-2 screens; not required for a single simple one). The route file should be nearly empty of
   logic — it imports and renders the feature's screen component. (The scaffolded `login.tsx` and
   `(app)/index.tsx` are the one exception: they're throwaway proof-of-wiring placeholders, not
   real screens yet — extract them into `src/features/auth/` once the real screen is built.)
3. **What kind of state is involved?** Use the table in `docs/architecture.md` §3:
   - Comes from an API → TanStack Query hook in `features/<feature>/api`.
   - Small, global, client-only → Zustand slice (one store per concern).
   - Form input → React Hook Form + Zod schema.
   - Local to one component → `useState`.
   If you catch yourself putting API response data into Zustand, or building a manual fetch +
   `useState` for server data, stop — that's the wrong tool.
4. **Does this cross a feature boundary?** Only import another feature's `index.ts` (its public
   surface), never its internals. If two features need the same thing, promote it to
   `src/shared/` instead of importing across internals.
5. **Native/runtime specifics:**
   - Tokens/secrets → `shared/lib/secureStorage.ts` (wraps `expo-secure-store`) only.
   - Assume New Architecture is on — don't add a library known to require legacy-arch opt-out
     without flagging it.
   - Assume development builds (not Expo Go) — native modules are expected to work.

## Common mistakes to avoid

- A giant `src/components/` folder holding whole screens — screens live in their feature.
- A single mega Zustand store for "app state" — split by concern.
- Business logic inside `src/app/` route files.
- A second HTTP client instance instead of using `shared/api/client.ts`.
- Hardcoding a query key at the call site instead of using the feature's key factory.
