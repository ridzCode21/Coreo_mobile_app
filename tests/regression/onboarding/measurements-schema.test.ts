/**
 * Issue #168 — "About you" (7a·4) collects age/height/weight with a drag-only `SliderRow`
 * (`AboutYouScreen.tsx`, min/max 16–90 / 140–210 / 40–160, the same bounds this schema uses), so a
 * normal drag can never leave that range. But nothing validated the draft itself before it was
 * sent to `POST /users/register/` — a stale or corrupted persisted draft (`onboardingStore.ts`,
 * persisted via `zustand/middleware`) could still carry an out-of-range value (the backend's own
 * `age` bound is 1–120, `apps/users/serializers.py:44`, with no bound at all on `height_cm`/
 * `weight_kg` beyond non-negative). This schema is the client-side gate the issue asks for.
 */
import { aboutYouMeasurementsSchema } from '@/features/onboarding/schemas';

describe('onboarding: about-you measurements schema (issue #168)', () => {
  function values(
    overrides: Partial<{ ageYears: number; heightCm: number; weightKg: number }> = {},
  ) {
    return { ageYears: 28, heightCm: 170, weightKg: 70, ...overrides };
  }

  it('accepts values at the slider bounds', () => {
    expect(aboutYouMeasurementsSchema.safeParse(values({ ageYears: 16 })).success).toBe(true);
    expect(aboutYouMeasurementsSchema.safeParse(values({ ageYears: 90 })).success).toBe(true);
    expect(aboutYouMeasurementsSchema.safeParse(values({ heightCm: 140 })).success).toBe(true);
    expect(aboutYouMeasurementsSchema.safeParse(values({ heightCm: 210 })).success).toBe(true);
    expect(aboutYouMeasurementsSchema.safeParse(values({ weightKg: 40 })).success).toBe(true);
    expect(aboutYouMeasurementsSchema.safeParse(values({ weightKg: 160 })).success).toBe(true);
  });

  it.each([
    ['ageYears', 0],
    ['ageYears', 99999],
    ['heightCm', 0],
    ['heightCm', 99999],
    ['weightKg', 0],
    ['weightKg', 99999],
  ])('rejects an impossible %s of %d with a friendly message', (field, bad) => {
    const result = aboutYouMeasurementsSchema.safeParse(values({ [field]: bad }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((entry) => entry.path.join('.') === field);
      expect(issue?.message).toBeTruthy();
      expect(issue?.message).not.toMatch(/invalid|error/i);
    }
  });
});
