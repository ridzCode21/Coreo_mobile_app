# Onboarding v2 — Value-first flow (one interview → preview → signup-last)

Status: **PROPOSED (plan only, no code).** Owner: Jarvis. Date: 2026-07-23.
Supersedes the flow _sequencing_ in `onboarding-refinement-plan.md` (that plan's screens,
cards, `WaveChart`, and config-driven diet interview all stay — only the **order** and the
**commit point** change). Extends `implementation-plan.md` Phase 3.

Confirmed decision: adopt the market-standard **value-first, signup-last** pattern
(Cal AI / Noom / MacroFactor / Lose It). Collect the whole profiling interview into the
client draft, show the calibrating preview, then create the account to _save the plan_, and
flush everything to the API in one commit.

---

## 0. Why (the problem this fixes)

Today the auth wall sits in the middle: 8 pre-auth "core setup" screens → `register` → 10
diet questions → calibrating. The meaningful half of the interview sits _behind_ signup, so
users feel "asked again" after creating an account. The `register` + `PUT diet-profile`
contract does **not** force this — `onboardingStore` is already a client-only draft that only
becomes server data on commit. We move signup to the end where value is highest.

---

## 1. Target flow (one unified track)

| #   | Screen                                           | Writes to draft                                  | API field(s) at commit                                              |
| --- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Welcome / first-open                             | —                                                | —                                                                   |
| 2   | Name                                             | `name`                                           | `first_name`/`last_name` (register)                                 |
| 3   | **Goal (single-select)**                         | `dietProfile.goal_type` _(new draft field)_      | `goal_type`                                                         |
| 4   | About you: age, **gender**, height, weight       | `ageYears`, **`gender`**, `heightCm`, `weightKg` | `date_of_birth`+`gender` (register), `height_cm`+`weight_kg` (diet) |
| 5   | Target weight _(shown only if goal = lose/gain)_ | `dietProfile.target_weight_kg`                   | `target_weight_kg`                                                  |
| 6   | Activity level                                   | `activity_level`                                 | `activity_level`                                                    |
| 7   | Diet type *                                      | `diet_type`                                      | `diet_type`                                                         |
| 8   | Cuisine *                                        | `cuisine_preference`                             | `cuisine_preference`                                                |
| 9   | Allergies / dislikes                             | `allergies[]`, `disliked_foods[]`                | `allergies`, `disliked_foods`                                       |
| 10  | Who cooks                                        | `cooking_frequency`                              | `cooking_frequency`                                                 |
| 11  | Meal rhythm                                      | `meal_frequency`                                 | `meal_frequency`                                                    |
| 12  | Budget                                           | `budget_tier`                                    | `budget_tier`                                                       |
| 13  | Health conditions (≤3)                           | `health_conditions[]`                            | `health_conditions`                                                 |
| 14  | Weak moment _(optional, mock)_                   | `weakMoments[]`                                  | — (F3, mock-only)                                                   |
| 15  | **Calibrating** wave = the payoff/preview        | reads draft (not GET yet)                        | —                                                                   |
| 16  | **Create account to save your plan** (register)  | —                                                | `register` → then one `PUT diet-profile`                            |
| 17  | → Home                                           | —                                                | —                                                                   |

Server-defaulted, never asked: `cooking_time_max`, `eating_pattern` (`mixed`),
`target_source` (`calculated`), `daily_*` targets (auto-derived).
`onboarding_complete` flips true after commit once `goal_type` + `diet_type` +
`cuisine_preference` are set — all captured above.

Screen count: **~18 → ~14** (sources + reading leave the required path — see §4).

---

## 2. The commit-strategy change (the core architectural shift)

Current: `DietQuestionScreen` PUTs each answer immediately (`useUpdateDietProfileMutation`),
which requires auth mid-interview. That was only possible because the diet interview ran
_after_ register.

New:

- Every interview screen writes **only to the Zustand draft** — no network, no auth needed
  during the interview.
- The **calibrating** screen computes completeness from the **local draft** (a draft→profile
  adapter fed into the existing `dietProfileCompleteness`), not from `GET diet-profile`.
- After a successful `register` at screen 16, do **one** `PUT /users/me/diet-profile/` with
  the whole draft, then check the returned `onboarding_complete` and route to Home.
- `SaveScreen` stops branching on the diet pillar; the interview already happened. It becomes:
  register → single diet PUT → Home.

This _simplifies_ the code (no per-answer mutation, no auth-gated interview) while matching
the confirmed flow.

---

## 3. Draft persistence (the one real cost of signup-last)

`onboardingStore` is in-memory and "ephemeral by design" today — with signup at the end, an
app kill on screen 13 loses 13 screens of answers. Fix:

- Wrap `onboardingStore` with Zustand's `persist` middleware backed by **AsyncStorage**
  (answers only — **no tokens**, so CLAUDE.md §6 / SecureStore rule is untouched).
- Persist the whole `draft`; **clear it** (`reset()`) once the flow commits and hands off to
  `(app)` home (already the reset point).
- Resume rule: on launch, if a persisted draft exists and the user isn't authed, resume the
  interview at the first unanswered screen. If register succeeded but the diet PUT didn't
  (killed between 16 and 17), retry the PUT from the persisted draft on next launch.

---

## 4. Screens leaving the required path

- **`sources` + `reading`** (wearables): out of MVP scope (product-context §5). Recommend
  moving to an **optional post-signup "connect a device — coming soon"** entry point, or
  cutting for MVP. Not in the required interview either way. _(Decision D1 below.)_
- **`pillars`**: only the diet/nutrition interview exists in MVP (fitness/wellness interviews
  are F2, no API home yet). Recommend keeping a light "what do you want to focus on" screen
  for positioning but **not gating** anything on it — everyone runs the nutrition interview
  in MVP. _(Decision D2 below.)_
- **`promise`**: keep — it's a low-cost commitment beat, fine either just before calibrating
  or just before signup.

---

## 5. New / changed pieces

- **`goal_type` becomes a real question** (screen 3), written straight to the draft. Retire
  the lossy `resolveGoalType` heuristic (F4) — keep it only as a fallback if goal is somehow
  unset. Add `goal_type` to `DietProfileDraft`.
- **`gender`** added to About You and to `OnboardingDraft`; needed for the Mifflin-St Jeor
  target estimate and accepted by `register`. Closes a current gap (targets can't be right
  without it).
- **age → `date_of_birth`**: register wants a DOB; we collect age. Convert age→approx DOB at
  commit (flagged approximation) **or** collect DOB. _(Decision D3 below.)_
- **One progress track**: merge `coreStepProgress` + `dietStepProgress` into a single ordered
  step list so the dots read as one continuous interview, not two.
- **Unified sequencer**: fold the diet questions into one `getNextStep`/step-id list
  (extend `steps.ts` + `dietQuestions.ts`) so ordering/skip logic (e.g. hide target-weight
  when goal = maintain) lives in one pure place.

---

## 6. Open decisions (my defaults — confirm or correct)

- **D1 — sources/reading:** default = move to optional post-signup "connect later (coming
  soon)". Alt = cut entirely for MVP.
- **D2 — pillars:** default = keep as a non-gating focus screen. Alt = drop for MVP, re-add
  when fitness/wellness interviews exist.
- **D3 — age vs DOB:** default = keep the age slider, convert to approx DOB at register. Alt =
  collect DOB directly (more accurate, one extra field).
- **D4 — goal screen source:** the design has no dedicated `goal_type` screen; this is a
  net-new screen in the existing style (design-system §9-style flag).

---

## 7. Acceptance criteria

- [ ] Whole interview runs pre-signup into the draft; no auth required until screen 16.
- [ ] Killing the app mid-interview resumes at the first unanswered screen (persisted draft).
- [ ] After register, a single `PUT diet-profile` commits the draft; `onboarding_complete`
      gates Home.
- [ ] `goal_type` and `gender` are asked, not derived/guessed.
- [ ] `sources`/`reading` are off the required path; pillars doesn't gate the interview.
- [ ] One continuous progress track; `EXPO_PUBLIC_API_MODE=live` still needs zero feature-code
      changes; no hardcoded design values; `pr-review` passes.
