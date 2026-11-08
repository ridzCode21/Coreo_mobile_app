/**
 * Issue #183 — the typed-email confirmation on design `19i Delete account · confirm email`
 * (design html lines 3469-3488) must match "case-insensitive, trimmed" per the issue text.
 * Backend confirms it never checks this itself (`apps/users/api/views/profile.py:210-213`,
 * `request.user.delete()` reads no request body), so the match is purely a frontend gate —
 * this pure function is the entire contract for that gate.
 */

import { matchesAccountEmail } from '@/features/profile/lib/deleteAccountCopy';

describe('profile: matchesAccountEmail (issue #183)', () => {
  it('matches an exact, identical email', () => {
    expect(matchesAccountEmail('priya@example.com', 'priya@example.com')).toBe(true);
  });

  it('matches regardless of case', () => {
    expect(matchesAccountEmail('Priya@Example.COM', 'priya@example.com')).toBe(true);
  });

  it('matches with leading/trailing whitespace on the typed value', () => {
    expect(matchesAccountEmail('  priya@example.com  ', 'priya@example.com')).toBe(true);
  });

  it('does not match a different email', () => {
    expect(matchesAccountEmail('someoneelse@example.com', 'priya@example.com')).toBe(false);
  });

  it('does not match an empty string', () => {
    expect(matchesAccountEmail('', 'priya@example.com')).toBe(false);
  });

  it('does not match a value that is only whitespace', () => {
    expect(matchesAccountEmail('   ', 'priya@example.com')).toBe(false);
  });

  it('does not match a partial prefix of the real email', () => {
    expect(matchesAccountEmail('priya', 'priya@example.com')).toBe(false);
  });
});
