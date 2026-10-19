/**
 * Issue #44 — the profile screen needs the account's `created_at` to compute "With Coreo since
 * <Month> · Week <N>" (design-spec.md 19a #5). `GET /users/profile/` already returns it
 * (`UserDetailSerializer`, `apps/users/serializers.py:546-580`, field `created_at`) and the mock
 * already includes it (`src/features/auth/mocks/serializeUser.ts:45`), but the frontend schema in
 * `profileApi.ts` silently drops it — only `first_name`/`calibration_*`/`wave` are parsed. This
 * locks in the fix: the schema must parse and expose `created_at` too, without touching any field
 * `CoreoHomeScreen` already reads (additive change only).
 */

import { profileResponseSchema } from '@/features/auth/api/profileApi';

describe('auth: GET /users/profile/ response schema includes created_at (issue #44)', () => {
  it('parses created_at from the envelope', () => {
    const parsed = profileResponseSchema.parse({
      success: true,
      data: {
        user: {
          first_name: 'Asha',
          calibration_day: null,
          calibration_complete: true,
          wave: 'solid',
          created_at: '2026-03-02T00:00:00Z',
        },
      },
    });

    expect(parsed.data.user.created_at).toBe('2026-03-02T00:00:00Z');
  });

  it('still requires the fields CoreoHomeScreen already depends on (no regression)', () => {
    expect(() =>
      profileResponseSchema.parse({
        success: true,
        data: {
          user: {
            calibration_day: null,
            calibration_complete: true,
            wave: 'solid',
            created_at: '2026-03-02T00:00:00Z',
          },
        },
      }),
    ).toThrow();
  });
});
