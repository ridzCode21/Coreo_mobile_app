export type WeeklyDietReviewDay = {
  date: string;
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  calories_in: number;
  protein_g: number;
  weight_kg: number | null;
  target_calories: number | null;
  on_target: boolean;
  late_dinner: boolean;
};

export type WeeklyDietReviewTargetChange = {
  previous_calories: number | null;
  new_calories: number;
  changed_at: string;
  source: 'manual' | 'calculated';
  note: string;
};

export type WeeklyDietReview = {
  week_start: string;
  week_end: string;
  generated_at: string;
  days_on_target: number;
  headline: string;
  subtitle: string;
  adherence_line: string;
  pattern_callout: string;
  recommendation: {
    title: string;
    detail: string;
  };
  days: WeeklyDietReviewDay[];
  target_changes: WeeklyDietReviewTargetChange[];
};
