import { requireMockUser } from '@/shared/api/mock/auth';
import { mockDb } from '@/shared/api/mock/db';
import { styleAError, styleB } from '@/shared/api/mock/envelope';
import { registerMock } from '@/shared/api/mock/router';
import {
  CHECK_IN_STYLE,
  MORNING_FIRST,
  WELLNESS_FOCUS,
  WHAT_HELPS,
  computeWellnessInterviewComplete,
  type WellnessProfile,
  type WellnessProfilePatch,
} from '@/shared/types/wellnessProfile';

const EMPTY_WELLNESS_PROFILE: WellnessProfile = {
  wellness_interview_complete: false,
  wellness_focus: '',
  nights_note: '',
  nights_tags: [],
  morning_first: '',
  what_helps: [],
  check_in_style: '',
  hide_numbers: false,
};

function getOrCreateProfile(userId: string): WellnessProfile {
  const existing = mockDb.wellnessProfiles[userId];
  if (existing) return existing;
  const created: WellnessProfile = { ...EMPTY_WELLNESS_PROFILE };
  mockDb.wellnessProfiles[userId] = created;
  return created;
}

function validateChoiceList(value: unknown): string | null {
  if (!Array.isArray(value)) return 'Must be a list.';
  if (value.length === 0) return 'Pick at least one.';
  for (const item of value) {
    if (typeof item !== 'string' || !WHAT_HELPS.includes(item as never)) {
      return `"${String(item)}" is not a valid choice.`;
    }
  }
  if (new Set(value).size !== value.length) return 'Each choice can appear only once.';
  if (value.includes('havent_found_it') && value.length > 1) {
    return '"Haven\'t found it" cannot be combined with another help.';
  }
  return null;
}

const PATCH_FIELDS = [
  'wellness_focus',
  'nights_note',
  'morning_first',
  'what_helps',
  'check_in_style',
  'hide_numbers',
] as const;

function knownPatch(rawPatch: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    PATCH_FIELDS.filter((field) => rawPatch[field] !== undefined).map((field) => [
      field,
      rawPatch[field],
    ]),
  );
}

function invalidChoice(value: unknown, allowed: readonly string[]): boolean {
  return value !== '' && (typeof value !== 'string' || !allowed.includes(value));
}

function validatePatch(patch: Record<string, unknown>): Record<string, string[]> | null {
  if (Object.keys(patch).length === 0) {
    return { non_field_errors: ['Send at least one wellness answer.'] };
  }

  const errors: Record<string, string[]> = {};
  if (patch.wellness_focus !== undefined && invalidChoice(patch.wellness_focus, WELLNESS_FOCUS)) {
    errors.wellness_focus = [`"${String(patch.wellness_focus)}" is not a valid choice.`];
  }
  if (patch.morning_first !== undefined && invalidChoice(patch.morning_first, MORNING_FIRST)) {
    errors.morning_first = [`"${String(patch.morning_first)}" is not a valid choice.`];
  }
  if (patch.check_in_style !== undefined && invalidChoice(patch.check_in_style, CHECK_IN_STYLE)) {
    errors.check_in_style = [`"${String(patch.check_in_style)}" is not a valid choice.`];
  }
  if (patch.what_helps !== undefined) {
    const error = validateChoiceList(patch.what_helps);
    if (error) errors.what_helps = [error];
  }
  if (
    patch.nights_note !== undefined &&
    (typeof patch.nights_note !== 'string' || patch.nights_note.length > 2000)
  ) {
    errors.nights_note = ['Ensure this field has no more than 2000 characters.'];
  }
  if (patch.hide_numbers !== undefined && typeof patch.hide_numbers !== 'boolean') {
    errors.hide_numbers = ['Must be a valid boolean.'];
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

registerMock('GET', '/users/me/wellness-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }
  return { status: 200, delayMs: 250, body: styleB(getOrCreateProfile(user.id)) };
});

registerMock('PUT', '/users/me/wellness-profile/', (request) => {
  const user = requireMockUser(request);
  if (!user) {
    return { status: 401, body: styleAError('UNAUTHORIZED', 'Authentication required.') };
  }

  const rawPatch = knownPatch((request.body ?? {}) as Record<string, unknown>);
  if (typeof rawPatch.nights_note === 'string') rawPatch.nights_note = rawPatch.nights_note.trim();
  const validationErrors = validatePatch(rawPatch);
  if (validationErrors) return { status: 400, body: validationErrors };

  const patch = rawPatch as WellnessProfilePatch;
  const merged: WellnessProfile = { ...getOrCreateProfile(user.id), ...patch };
  merged.wellness_interview_complete = computeWellnessInterviewComplete(merged);
  mockDb.wellnessProfiles[user.id] = merged;
  return { status: 200, delayMs: 300, body: styleB(merged) };
});
