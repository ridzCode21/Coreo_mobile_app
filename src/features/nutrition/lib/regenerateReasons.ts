import type { RegenerationReason } from '@/shared/types/mealPlan';

export const REGENERATE_REASONS: { label: string; value: RegenerationReason }[] = [
  { label: 'Too boring', value: 'too_boring' },
  { label: 'Too expensive', value: 'too_expensive' },
  { label: 'Too much cooking', value: 'too_much_cooking' },
  { label: "Don't like these foods", value: 'dont_like_foods' },
  { label: 'Need more protein', value: 'need_more_protein' },
  { label: 'Make it lighter', value: 'make_lighter' },
  { label: 'Different cuisine', value: 'different_cuisine' },
  { label: 'Surprise me', value: 'surprise_me' },
];

export function regenerateReasonLabel(reason: RegenerationReason): string {
  return REGENERATE_REASONS.find((item) => item.value === reason)?.label ?? reason;
}
