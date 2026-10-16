import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb } from '@/shared/api/mock/db';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';
import {
  FITNESS_GOALS,
  PROTECTED_AREAS,
  SPORTS,
  TRAINING_PLACES,
  computeFitnessInterviewComplete,
  type FitnessProfile,
  type FitnessProfilePatch,
} from '@/shared/types/fitnessProfile';

const EMPTY_FITNESS_PROFILE: FitnessProfile = {
  fitness_interview_complete: false,
  fitness_goal: '',
  training_places: [],
  movement_note: '',
  sports: [],
  protected_areas: [],
};

function getOrCreateProfile(userId: string): FitnessProfile {
  const existing = mockDb.fitnessProfiles[userId];
  if (existing) return existing;
  const created: FitnessProfile = { ...EMPTY_FITNESS_PROFILE };
  mockDb.fitnessProfiles[userId] = created;
  return created;
}

function validateChoiceList(
  value: unknown,
  allowed: readonly string[],
  alone?: { value: string; message: string },
): string | null {
  if (!Array.isArray(value)) return 'Must be a list.';
  if (value.length === 0) return 'Pick at least one.';
  for (const item of value) {
    if (typeof item !== 'string' || !allowed.includes(item)) {
      return `"${String(item)}" is not a valid choice.`;
    }
  }
  if (new Set(value).size !== value.length) return 'Each choice can appear only once.';
  if (alone && value.includes(alone.value) && value.length > 1) return alone.message;
  return null;
}

const PATCH_FIELDS = [
  'fitness_goal',
  'training_places',
  'movement_note',
  'sports',
  'protected_areas',
] as const;

function knownPatch(rawPatch: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    PATCH_FIELDS.filter((field) => rawPatch[field] !== undefined).map((field) => [
      field,
      rawPatch[field],
    ]),
  );
}

function validatePatch(patch: Record<string, unknown>): Record<string, string[]> | null {
  if (Object.keys(patch).length === 0) {
    return { non_field_errors: ['Send at least one fitness answer.'] };
  }

  const errors: Record<string, string[]> = {};
  if (
    patch.fitness_goal !== undefined &&
    patch.fitness_goal !== '' &&
    (typeof patch.fitness_goal !== 'string' || !FITNESS_GOALS.includes(patch.fitness_goal as never))
  ) {
    errors.fitness_goal = [`"${String(patch.fitness_goal)}" is not a valid choice.`];
  }
  if (patch.training_places !== undefined) {
    const error = validateChoiceList(patch.training_places, TRAINING_PLACES);
    if (error) errors.training_places = [error];
  }
  if (patch.sports !== undefined) {
    const error = validateChoiceList(patch.sports, SPORTS, {
      value: 'nothing_regular',
      message: '"Nothing regular" cannot be combined with a sport.',
    });
    if (error) errors.sports = [error];
  }
  if (patch.protected_areas !== undefined) {
    const error = validateChoiceList(patch.protected_areas, PROTECTED_AREAS, {
      value: 'nothing_to_flag',
      message: '"Nothing to flag" cannot be combined with an area.',
    });
    if (error) errors.protected_areas = [error];
  }
  if (
    patch.movement_note !== undefined &&
    (typeof patch.movement_note !== 'string' || patch.movement_note.length > 2000)
  ) {
    errors.movement_note = ['Ensure this field has no more than 2000 characters.'];
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

registerMock('GET', '/users/me/fitness-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }
  return { status: 200, delayMs: 250, body: styleB(getOrCreateProfile(user.id)) };
});

registerMock('PUT', '/users/me/fitness-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  const rawPatch = knownPatch((request.body ?? {}) as Record<string, unknown>);
  if (typeof rawPatch.movement_note === 'string') {
    rawPatch.movement_note = rawPatch.movement_note.trim();
  }
  const validationErrors = validatePatch(rawPatch);
  if (validationErrors) return { status: 400, body: validationErrors };

  const patch = rawPatch as FitnessProfilePatch;
  const merged: FitnessProfile = { ...getOrCreateProfile(user.id), ...patch };
  merged.fitness_interview_complete = computeFitnessInterviewComplete(merged);
  mockDb.fitnessProfiles[user.id] = merged;
  return { status: 200, delayMs: 300, body: styleB(merged) };
});
