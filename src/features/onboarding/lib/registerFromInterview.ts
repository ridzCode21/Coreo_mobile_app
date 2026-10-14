import type { RegisterFormValues, RegisterRequestValues } from '@/features/auth';
import type { OnboardingDraft } from '@/features/onboarding/store/onboardingStore';
import type { InterviewGoal } from '@/shared/types/user';

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Friend', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'friend';
}

export function interviewFieldsFromDraft(
  draft: OnboardingDraft,
): Pick<RegisterRequestValues, 'goal' | 'activePillars'> &
  Partial<Pick<RegisterRequestValues, 'age' | 'heightCm' | 'weightKg' | 'gender'>> {
  const base = {
    goal: draft.goal as InterviewGoal,
    activePillars: draft.pillars,
  };

  if (!draft.pillars.includes('diet')) return base;

  return {
    ...base,
    age: draft.ageYears,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    ...(draft.gender ? { gender: draft.gender } : {}),
  };
}

export function buildMockSocialIdentity(
  provider: 'google',
  draft: OnboardingDraft,
): RegisterRequestValues {
  const { firstName, lastName } = splitName(draft.name);
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName,
    lastName,
    email: `${slugify(draft.name)}.${provider}.${unique}@mock.coreo.app`,
    password: `Mock-${unique}-Aa1`,
    ...interviewFieldsFromDraft(draft),
  };
}

export function isExistingEmailError(fieldErrors: Record<string, string[]> | null): boolean {
  return Boolean(
    fieldErrors?.email?.some((message) => /already (exists|registered|used)/i.test(message)),
  );
}

export function registerFormField(field: string): keyof RegisterFormValues | null {
  if (field === 'email') return 'email';
  if (field === 'first_name' || field === 'firstName') return 'firstName';
  if (field === 'last_name' || field === 'lastName') return 'lastName';
  if (field === 'password' || field === 'password_confirm') return 'password';
  return null;
}
