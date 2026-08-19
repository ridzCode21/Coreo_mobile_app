/**
 * Account-level enums shared by auth (register/profile) and onboarding (About You collects
 * gender for the Mifflin-St Jeor estimate — API_REFERENCE.md §17). Kept separate from
 * `shared/types/dietProfile.ts` since gender belongs to the user/account domain, not the diet
 * profile, even though the diet estimate reads it.
 */
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];
