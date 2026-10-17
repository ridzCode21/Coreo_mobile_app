/**
 * Issue #51 — `usePillarSelectionStore` is the client-only mirror of `active_pillars`
 * (plan.md Decision 2/3): the real backend's "me"/register response never returns
 * `active_pillars` (backend/apps/users/serializers.py:546-576 UserDetailSerializer omits it), so
 * this store captures the value the frontend already sent at registration instead of fetching it.
 * These tests cover the store in isolation; capture-on-registration and clear-on-sign-out are
 * covered where those flows live (onboarding/create-account-screen, onboarding/save-screen-
 * registration, auth/profile-cache).
 */

import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';

describe('auth: pillar selection store (issue #51)', () => {
  beforeEach(() => {
    usePillarSelectionStore.setState({ activePillars: [], hasHydrated: false });
  });

  it('starts with no pillars selected and not yet hydrated', () => {
    const state = usePillarSelectionStore.getState();
    expect(state.activePillars).toEqual([]);
    expect(state.hasHydrated).toBe(false);
  });

  it('setActivePillars replaces the stored list exactly', () => {
    usePillarSelectionStore.getState().setActivePillars(['diet', 'fitness']);

    expect(usePillarSelectionStore.getState().activePillars).toEqual(['diet', 'fitness']);

    usePillarSelectionStore.getState().setActivePillars(['wellness']);

    expect(usePillarSelectionStore.getState().activePillars).toEqual(['wellness']);
  });

  it('setHasHydrated flips the hydration flag', () => {
    usePillarSelectionStore.getState().setHasHydrated(true);

    expect(usePillarSelectionStore.getState().hasHydrated).toBe(true);
  });

  it('clear empties the pillar list (used on sign-out)', () => {
    usePillarSelectionStore.getState().setActivePillars(['diet', 'fitness', 'wellness']);

    usePillarSelectionStore.getState().clear();

    expect(usePillarSelectionStore.getState().activePillars).toEqual([]);
  });
});
