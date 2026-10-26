/**
 * Issue #41 — pure-logic rules backing the wellness interview (17a·1-17a·5):
 * `computeWellnessInterviewComplete` mirrors the backend's completion rule exactly
 * (`apps/users/services/wellness_profile.py:4-10`, backend test
 * `test_completion_needs_check_in_style_but_not_the_note` — `apps/users/test_wellness_profile.py:
 * 115-127`): true only when `wellness_focus`, `morning_first`, `what_helps`, and `check_in_style`
 * are all truthy; `nights_note` and `hide_numbers` never count. `wellnessProfileSchema`/
 * `wellnessProfilePatchSchema` match the backend response/request shape exactly
 * (`apps/users/serializers.py:406-442`, `apps/users/services/wellness_profile.py:13-22`).
 */

import {
  computeWellnessInterviewComplete,
  wellnessProfilePatchSchema,
  wellnessProfileSchema,
} from '@/shared/types/wellnessProfile';

const EMPTY = {
  wellness_interview_complete: false,
  wellness_focus: '' as const,
  nights_note: '',
  nights_tags: [] as string[],
  morning_first: '' as const,
  what_helps: [] as string[],
  check_in_style: '' as const,
  hide_numbers: false,
};

const FULL = {
  wellness_interview_complete: true,
  wellness_focus: 'racing_mind' as const,
  nights_note: 'In bed by 11:30 but on the phone till 1.',
  nights_tags: ['Bed 11:30, phone till 1', 'Wakes ~4 AM'],
  morning_first: 'phone' as const,
  what_helps: ['walks', 'chai'],
  check_in_style: 'step_in' as const,
  hide_numbers: true,
};

describe('wellness profile: computeWellnessInterviewComplete (#41)', () => {
  it('is false when nothing has been answered', () => {
    expect(
      computeWellnessInterviewComplete({
        wellness_focus: '',
        morning_first: '',
        what_helps: [],
        check_in_style: '',
      }),
    ).toBe(false);
  });

  it('is false when any one of focus/morning/helps/check-in is still missing', () => {
    const full = {
      wellness_focus: 'racing_mind' as const,
      morning_first: 'phone' as const,
      what_helps: ['walks'],
      check_in_style: 'step_in' as const,
    };
    expect(computeWellnessInterviewComplete({ ...full, wellness_focus: '' })).toBe(false);
    expect(computeWellnessInterviewComplete({ ...full, morning_first: '' })).toBe(false);
    expect(computeWellnessInterviewComplete({ ...full, what_helps: [] })).toBe(false);
    expect(computeWellnessInterviewComplete({ ...full, check_in_style: '' })).toBe(false);
  });

  it('is true once all four required fields have an answer, note and hide_numbers never counting', () => {
    expect(
      computeWellnessInterviewComplete({
        wellness_focus: 'sleep',
        morning_first: 'snooze',
        what_helps: ['havent_found_it'],
        check_in_style: 'only_when_i_come',
      }),
    ).toBe(true);
  });
});

describe('wellness profile: wellnessProfileSchema (#41)', () => {
  it('parses the backend empty shape', () => {
    expect(wellnessProfileSchema.parse(EMPTY)).toEqual(EMPTY);
  });

  it('parses the backend full shape', () => {
    expect(wellnessProfileSchema.parse(FULL)).toEqual(FULL);
  });

  it('rejects read-only nights_tags in a patch', () => {
    expect(() => wellnessProfilePatchSchema.parse({ nights_tags: [] })).toThrow();
  });

  it('rejects an unknown extra key (strict)', () => {
    expect(() => wellnessProfileSchema.parse({ ...EMPTY, extra_field: 'x' })).toThrow();
  });

  it('rejects an invalid wellness_focus value', () => {
    expect(() => wellnessProfileSchema.parse({ ...EMPTY, wellness_focus: 'anxiety' })).toThrow();
  });
});

describe('wellness profile: wellnessProfilePatchSchema (#41)', () => {
  it('accepts a single-field patch', () => {
    expect(wellnessProfilePatchSchema.parse({ wellness_focus: 'low_energy' })).toEqual({
      wellness_focus: 'low_energy',
    });
  });

  it('accepts a blank choice value to clear a field', () => {
    expect(wellnessProfilePatchSchema.parse({ check_in_style: '' })).toEqual({
      check_in_style: '',
    });
  });

  it('rejects an empty what_helps list', () => {
    expect(() => wellnessProfilePatchSchema.parse({ what_helps: [] })).toThrow();
  });

  it('rejects "havent_found_it" combined with another help', () => {
    expect(() =>
      wellnessProfilePatchSchema.parse({ what_helps: ['havent_found_it', 'walks'] }),
    ).toThrow();
  });

  it('accepts "havent_found_it" alone', () => {
    expect(wellnessProfilePatchSchema.parse({ what_helps: ['havent_found_it'] })).toEqual({
      what_helps: ['havent_found_it'],
    });
  });

  it('rejects duplicate what_helps entries', () => {
    expect(() => wellnessProfilePatchSchema.parse({ what_helps: ['walks', 'walks'] })).toThrow();
  });

  it('rejects an empty patch object', () => {
    expect(() => wellnessProfilePatchSchema.parse({})).toThrow();
  });

  it('rejects an unknown field (strict)', () => {
    expect(() => wellnessProfilePatchSchema.parse({ unknown_field: 'x' })).toThrow();
  });

  it('trims nights_note', () => {
    expect(wellnessProfilePatchSchema.parse({ nights_note: '  hi  ' })).toEqual({
      nights_note: 'hi',
    });
  });
});
