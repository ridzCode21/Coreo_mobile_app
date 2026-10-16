import type {
  WeeklyDietReviewDay,
  WeeklyDietReviewTargetChange,
} from '@/shared/types/weeklyDietReview';

function monthAndDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  return `${monthAndDay(weekStart)} – ${monthAndDay(weekEnd)}`;
}

export function formatCalories(calories: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(calories);
}

export function dayBarHeightPercent(day: WeeklyDietReviewDay): number {
  if (!day.target_calories || day.calories_in <= 0) return 8;
  return Math.min(100, Math.max(8, (day.calories_in / day.target_calories) * 100));
}

export function latestTargetChange(
  changes: WeeklyDietReviewTargetChange[],
): WeeklyDietReviewTargetChange | null {
  // The backend orders target_changes by changed_at then id, oldest to newest.
  return changes.at(-1) ?? null;
}
