import type { RegisterRequestValues } from '@/features/auth';
import type { OnboardingDraft } from '@/features/onboarding/store/onboardingStore';
import type { InterviewGoal } from '@/shared/types/user';
export { splitName } from '@/shared/lib/name';

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

export function isExistingEmailError(fieldErrors: Record<string, string[]> | null): boolean {
  return Boolean(
    fieldErrors?.email?.some((message) => /already (exists|registered|used)/i.test(message)),
  );
}

export function registerFormField(field: string): 'email' | 'password' | 'passwordConfirm' | null {
  if (field === 'email') return 'email';
  if (field === 'password') return 'password';
  if (field === 'password_confirm' || field === 'passwordConfirm') return 'passwordConfirm';
  return null;
}
