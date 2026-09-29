/**
 * Public surface for the onboarding feature. Other features import only from here, never from
 * onboarding's internal files (architecture.md §2 import rules).
 *
 * Currently narrow on purpose: the diet-profile read is the one thing a sibling feature (nutrition)
 * legitimately needs post-onboarding — the committed profile carries the daily calorie/macro
 * targets the Diet home counts down from. (Route files still import onboarding *screens* by internal
 * path; consolidating those behind this surface is a separate cleanup, noted as a smell — not done
 * here to avoid touching unrelated code.)
 */
export {
  useDietProfileQuery,
  useUpdateDietProfileMutation,
  dietProfileKeys,
} from '@/features/onboarding/api/dietProfileApi';
export {
  profileChecklist,
  profileChecklistProgress,
  profileCompletion,
  targetQuality,
  type ProfileChecklistItem,
  type ProfileCompletionSection,
  type TargetQuality,
} from '@/features/onboarding/lib/profileCompletion';
