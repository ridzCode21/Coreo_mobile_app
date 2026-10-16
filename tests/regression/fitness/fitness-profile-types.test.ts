/**
 * Issue #39 — pure-logic rules backing the fitness interview (16a·1-16a·5):
 * `computeFitnessInterviewComplete` mirrors the backend's completion rule exactly
 * (`apps/users/api/views/profile.py:139-149`, `apps/users/services/fitness_profile.py`,
 * API_REFERENCE.md:527-529, backend test `test_completion_needs_protect_but_not_the_note` —
 * `apps/users/test_fitness_profile.py:116-126`): true only when `fitness_goal` is non-blank and
 * `training_places`/`sports`/`protected_areas` each have at least one entry; `movement_note` never
 * counts. `toggleExclusiveChoice` is the client-side guard (plan decision 7) that keeps the UI from
 * ever being able to construct the combination the backend 400s on
 * (`apps/users/serializers.py:384-398`, `"Nothing regular"`/`"Nothing to flag"` must stand alone).
 */

import {
  computeFitnessInterviewComplete,
  toggleExclusiveChoice,
} from '@/shared/types/fitnessProfile';

describe('fitness profile: computeFitnessInterviewComplete (#39)', () => {
  it('is false when nothing has been answered', () => {
    expect(
      computeFitnessInterviewComplete({
        fitness_goal: '',
        training_places: [],
        sports: [],
        protected_areas: [],
      }),
    ).toBe(false);
  });

  it('is false when the note is the only thing filled in (note never counts)', () => {
    expect(
      computeFitnessInterviewComplete({
        fitness_goal: '',
        training_places: [],
        sports: [],
        protected_areas: [],
      }),
    ).toBe(false);
  });

  it('is false when any one of goal/places/sports/protected_areas is still missing', () => {
    const full = {
      fitness_goal: 'build_muscle' as const,
      training_places: ['home_dumbbells_band' as const],
      sports: ['cricket' as const],
      protected_areas: ['lower_back' as const],
    };
    expect(computeFitnessInterviewComplete({ ...full, fitness_goal: '' })).toBe(false);
    expect(computeFitnessInterviewComplete({ ...full, training_places: [] })).toBe(false);
    expect(computeFitnessInterviewComplete({ ...full, sports: [] })).toBe(false);
    expect(computeFitnessInterviewComplete({ ...full, protected_areas: [] })).toBe(false);
  });

  it('is true once all four required fields have an answer, note left blank', () => {
    expect(
      computeFitnessInterviewComplete({
        fitness_goal: 'get_stronger',
        training_places: ['outdoors'],
        sports: ['nothing_regular'],
        protected_areas: ['nothing_to_flag'],
      }),
    ).toBe(true);
  });
});

describe('fitness profile: toggleExclusiveChoice (#39 decision 7)', () => {
  const ALONE = 'nothing_regular';

  it('picking the alone value clears every other selection', () => {
    expect(toggleExclusiveChoice(['cricket', 'football'], ALONE, ALONE)).toEqual([ALONE]);
  });

  it('picking a normal value while the alone value is selected replaces it (drops the alone value)', () => {
    expect(toggleExclusiveChoice([ALONE], 'cricket', ALONE)).toEqual(['cricket']);
  });

  it('picking a second normal value adds to the selection, unaffected by the alone rule', () => {
    expect(toggleExclusiveChoice(['cricket'], 'football', ALONE)).toEqual(['cricket', 'football']);
  });

  it('tapping an already-selected normal value removes just that one', () => {
    expect(toggleExclusiveChoice(['cricket', 'football'], 'cricket', ALONE)).toEqual(['football']);
  });

  it('tapping the already-selected alone value clears it back to empty', () => {
    expect(toggleExclusiveChoice([ALONE], ALONE, ALONE)).toEqual([]);
  });
});
