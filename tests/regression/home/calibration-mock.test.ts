/**
 * Issue #19 — the home calibrating state (days 1-3, dashed wave) and the solid state (day 4+) are
 * driven by `calibration_day`/`calibration_complete`/`wave`, which the backend computes in
 * `calibration_payload()`
 * (`/Users/Nuvo/Vipin/vipin/django_frontend/scripts/overnight/.state/refs/backend/apps/users/services/calibration.py:25-40`):
 * `day = (today - calibration_started_on).days + 1` (min 1), `complete = day >= 4`,
 * `wave = "solid" if complete else "dashed"`; a null `calibration_started_on` (onboarding complete,
 * clock never started) short-circuits straight to `{day: null, complete: true, wave: "solid"}`.
 * This test protects the mock's mirror of that exact pure function, `calibrationFields()`.
 */

import { CALIBRATION_DAYS, calibrationFields } from '@/features/auth/mocks/calibration';

describe('auth mock: calibrationFields (issue #19)', () => {
  it('exposes the same 4-day threshold the backend uses (calibration.py:8)', () => {
    expect(CALIBRATION_DAYS).toBe(4);
  });

  it('day 1: started today → dashed, not complete', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields('2026-10-14', today);
    expect(result).toEqual({ calibration_day: 1, calibration_complete: false, wave: 'dashed' });
  });

  it('day 2: started yesterday → dashed, not complete', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields('2026-10-13', today);
    expect(result).toEqual({ calibration_day: 2, calibration_complete: false, wave: 'dashed' });
  });

  it('day 3: started two days ago → dashed, not complete', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields('2026-10-12', today);
    expect(result).toEqual({ calibration_day: 3, calibration_complete: false, wave: 'dashed' });
  });

  it('day 4: started three days ago → solid, complete (calibration.py:35: day >= CALIBRATION_DAYS)', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields('2026-10-11', today);
    expect(result).toEqual({ calibration_day: 4, calibration_complete: true, wave: 'solid' });
  });

  it('day 9 (long past): still solid/complete, day keeps counting up (no cap)', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields('2026-10-06', today);
    expect(result).toEqual({ calibration_day: 9, calibration_complete: true, wave: 'solid' });
  });

  it('calibration_started_on null → already calibrated (calibration.py:30-31), not day 1', () => {
    const today = new Date(2026, 9, 14);
    const result = calibrationFields(null, today);
    expect(result).toEqual({ calibration_day: null, calibration_complete: true, wave: 'solid' });
  });
});
