---
name: security-review
description: >-
  Mobile app security checklist covering token/secret storage, network calls, input validation,
  and permissions. Use when touching auth, tokens, storage, permissions, or network code, and
  before finishing any feature that handles user or sensitive data.
disable-model-invocation: true
---

# Security Review

## Instructions

Walk through the relevant items whenever a change touches auth, storage, network, or device
permissions. Not every item applies to every change — skip what's irrelevant, but don't skip the
walk-through itself.

### Secrets & tokens

- [ ] Auth/refresh tokens and any sensitive small values go through
      `shared/lib/secureStorage.ts` (`expo-secure-store`) only — never `AsyncStorage`, a Zustand
      store, component state, or logs.
- [ ] No secrets/API keys hardcoded in source. Build-time config comes from `app.config.ts` +
      env vars / EAS secrets, not committed literals.
- [ ] Nothing sensitive is ever passed through `console.log`, crash reports, or analytics
      events — including in error messages once Sentry is added later.

### Network

- [ ] All requests go through the shared `shared/api/client.ts` instance (so auth headers,
      timeouts, and error normalization are consistent) — no ad-hoc `fetch` calls bypassing it.
- [ ] Requests use HTTPS only; no `http://` endpoints outside local dev.
- [ ] 401/403 responses are handled centrally (e.g. clear session, redirect to login) — not
      duplicated per screen.

### Input & data validation

- [ ] Any data crossing a trust boundary — API responses, deep link params, form input — is
      validated with a Zod schema before being used, not assumed to match the expected shape.
- [ ] Deep links are validated/allow-listed before navigating or acting on their params.

### Permissions & device data

- [ ] Any permission request (camera, health data, notifications, location) has a clear
      user-facing reason shown before/at the OS prompt, and the app degrades gracefully if
      denied — no hard crash or dead-end screen.
- [ ] Request the minimum permission scope needed for the feature, not broad access "for later."
- [ ] Health/fitness data handling considers platform health APIs (HealthKit/Health Connect)
      permission models specifically — these are more sensitive than generic device permissions.

### Auth flow specifics

- [ ] Session state (logged in/out) is derived from a single source of truth (the auth Zustand
      slice backed by SecureStore), not duplicated/inferred in multiple places that can drift out
      of sync.
- [ ] Logout clears SecureStore tokens and resets client-only state (Zustand stores, cached
      queries) — verify no stale authenticated data lingers after logout.

## Output

If any box can't be checked, either fix it or explicitly flag it to the user as a known gap
before considering the feature done — don't silently ship a known issue.
