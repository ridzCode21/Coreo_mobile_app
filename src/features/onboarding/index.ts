/**
 * Public surface for the onboarding feature. Other features import only from here, never from
 * onboarding's internal files (architecture.md §2 import rules).
 *
 * Exposes the routed pre-signup screens (for `src/app/(public)/*` route files), the step sequencer
 * and draft store that splash needs to resume an interrupted interview, and the diet-profile read
 * that nutrition/home need post-onboarding — the committed profile carries the daily calorie/macro
 * targets the Diet home counts down from.
 */
export { default as FirstOpenScreen } from '@/features/onboarding/screens/FirstOpenScreen';
export { default as NameScreen } from '@/features/onboarding/screens/NameScreen';
export { default as GoalScreen } from '@/features/onboarding/screens/GoalScreen';
export { default as AboutYouScreen } from '@/features/onboarding/screens/AboutYouScreen';
export { default as PillarsScreen } from '@/features/onboarding/screens/PillarsScreen';
export { default as SaveScreen } from '@/features/onboarding/screens/SaveScreen';
export { default as ArrivalScreen } from '@/features/onboarding/screens/ArrivalScreen';
export { default as CreateAccountScreen } from '@/features/onboarding/screens/CreateAccountScreen';
export { firstUnansweredFlowStep, flowStepRoute } from '@/features/onboarding/lib/steps';
export { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
export {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
export { NextBar } from '@/features/onboarding/components/NextBar';
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
