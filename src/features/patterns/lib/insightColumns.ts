export const insightColumnLabels: Record<string, string> = {
  calories_in: 'Calories in',
  calories_out: 'Calories out',
  protein_g: 'Protein',
  carbs_g: 'Carbs',
  fat_g: 'Fat',
  water_ml: 'Water',
  steps: 'Steps',
  weight_kg: 'Weight',
  sleep_hours: 'Sleep',
  hrv: 'HRV',
};

export function columnLabel(column: string): string {
  // Defensive-only: the strict API schema admits only the mapped backend columns.
  return (
    insightColumnLabels[column] ??
    column
      .split('_')
      .filter(Boolean)
      .map((word, index) =>
        index === 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word,
      )
      .join(' ')
  );
}
