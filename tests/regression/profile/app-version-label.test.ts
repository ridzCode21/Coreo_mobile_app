/**
 * Issue #179 — `getAppVersionLabel` builds the "v2.4.1"-style legal-row string (design 19d Account,
 * ~2864) from the app's own config, never a guess: iOS build numbers come from
 * `Constants.expoConfig.ios.buildNumber`, Android from `.android.versionCode`. Neither is set in
 * `app.config.ts` today, so the label must fall back to version-only rather than inventing a build
 * number (tests/README.md: "never an invented number"; plan.md Decision log).
 */

import { getAppVersionLabel } from '@/features/profile/lib/appVersionLabel';

describe('profile: getAppVersionLabel (issue #179)', () => {
  it('shows version only on iOS when no build number is configured', () => {
    expect(getAppVersionLabel({ version: '1.0.0' }, 'ios')).toBe('v1.0.0');
  });

  it('shows version only on Android when no version code is configured', () => {
    expect(getAppVersionLabel({ version: '1.0.0' }, 'android')).toBe('v1.0.0');
  });

  it('appends the iOS build number when present', () => {
    expect(getAppVersionLabel({ version: '1.0.0', ios: { buildNumber: '12' } }, 'ios')).toBe(
      'v1.0.0 (Build 12)',
    );
  });

  it('does not use the iOS build number on Android', () => {
    expect(getAppVersionLabel({ version: '1.0.0', ios: { buildNumber: '12' } }, 'android')).toBe(
      'v1.0.0',
    );
  });

  it('appends the Android version code when present', () => {
    expect(getAppVersionLabel({ version: '1.0.0', android: { versionCode: 7 } }, 'android')).toBe(
      'v1.0.0 (Build 7)',
    );
  });

  it('does not use the Android version code on iOS', () => {
    expect(getAppVersionLabel({ version: '1.0.0', android: { versionCode: 7 } }, 'ios')).toBe(
      'v1.0.0',
    );
  });

  it('returns null instead of inventing a version when none is configured', () => {
    expect(getAppVersionLabel({}, 'ios')).toBeNull();
  });

  it('returns null for a blank version string', () => {
    expect(getAppVersionLabel({ version: '   ' }, 'ios')).toBeNull();
  });
});
