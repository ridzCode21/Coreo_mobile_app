/**
 * Issue #180 — the sign-out sheet has three states (design `19e Sign out` and `19e Sign out ·
 * pending / offline / done`): default, queued-meals-pending, and offline. Pending beats offline
 * when both are true (plan.md Decision 3) because the data-loss risk is what matters, and a user
 * who is offline can't sync the queued meals anyway. Counts use digits with correct
 * singular/plural grammar, never spelled-out words (plan.md Decision 4).
 */

import {
  resolveSignOutSheetState,
  signOutSheetCopy,
} from '@/features/profile/lib/signOutSheetCopy';

describe('profile: sign-out sheet state resolution (issue #180)', () => {
  it('resolves to default when online with no queued meals', () => {
    expect(resolveSignOutSheetState({ isOnline: true, pendingMealCount: 0 })).toEqual({
      kind: 'default',
    });
  });

  it('resolves to offline when offline with no queued meals', () => {
    expect(resolveSignOutSheetState({ isOnline: false, pendingMealCount: 0 })).toEqual({
      kind: 'offline',
    });
  });

  it('resolves to pendingMeals when online with queued meals', () => {
    expect(resolveSignOutSheetState({ isOnline: true, pendingMealCount: 3 })).toEqual({
      kind: 'pendingMeals',
      count: 3,
    });
  });

  it('pending meals takes priority over offline (plan.md Decision 3)', () => {
    expect(resolveSignOutSheetState({ isOnline: false, pendingMealCount: 2 })).toEqual({
      kind: 'pendingMeals',
      count: 2,
    });
  });
});

describe('profile: sign-out sheet copy (issue #180)', () => {
  it('shows the default copy exactly as designed (19e Sign out)', () => {
    expect(signOutSheetCopy({ kind: 'default' })).toEqual({
      title: 'Sign out?',
      body: "You'll need to sign in again to see your core. Everything stays saved.",
      primaryLabel: 'Sign out',
      secondaryLabel: 'Cancel',
    });
  });

  it('shows the offline copy exactly as designed (19e states · Offline)', () => {
    expect(signOutSheetCopy({ kind: 'offline' })).toEqual({
      title: 'Offline',
      body: "You're offline. You can still sign out — you'll just need to sign in when you're back online.",
      primaryLabel: 'Sign out',
      secondaryLabel: 'Cancel',
    });
  });

  it('pluralizes the pending-meal count correctly for more than one meal', () => {
    expect(signOutSheetCopy({ kind: 'pendingMeals', count: 3 })).toEqual({
      title: '3 meals syncing',
      body: "3 meals haven't finished syncing. If you sign out now, they'll be lost.",
      primaryLabel: 'Sign out anyway',
      secondaryLabel: 'Wait',
    });
  });

  it('uses singular grammar for exactly one pending meal', () => {
    expect(signOutSheetCopy({ kind: 'pendingMeals', count: 1 })).toEqual({
      title: '1 meal syncing',
      body: "1 meal hasn't finished syncing. If you sign out now, it'll be lost.",
      primaryLabel: 'Sign out anyway',
      secondaryLabel: 'Wait',
    });
  });

  it('never claims meals will sync later — only that they will be lost', () => {
    const { body } = signOutSheetCopy({ kind: 'pendingMeals', count: 5 });
    expect(body).not.toMatch(/sync later|will sync/i);
    expect(body).toMatch(/lost/i);
  });
});
