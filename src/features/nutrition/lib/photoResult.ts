import type { CreateFoodEntryInput } from '@/features/nutrition/api/nutritionApi';
import type { MealType, PhotoEstimateItem } from '@/shared/types/food';

export type GuessNote = {
  item: PhotoEstimateItem;
  note: string;
};

export function pickGuessNote(items: PhotoEstimateItem[]): GuessNote | null {
  const item = items.find((candidate) => candidate.guessed && candidate.guess_note !== null);
  return item?.guess_note ? { item, note: item.guess_note } : null;
}

export function nextMealLabel(mealType: MealType): string {
  switch (mealType) {
    case 'breakfast':
      return 'lunch';
    case 'lunch':
      return 'dinner';
    case 'dinner':
      return 'tomorrow';
    case 'snack':
      return 'next meal';
  }
}

export function sortByGuessed(items: readonly PhotoEstimateItem[]): PhotoEstimateItem[] {
  return [...items].sort((left, right) => Number(left.guessed) - Number(right.guessed));
}

export function itemToEntry(
  item: PhotoEstimateItem,
  mealType: MealType,
  multiplier = 1,
  name = item.name,
): CreateFoodEntryInput {
  const scaled = (value: number) => Math.round(value * multiplier);

  return {
    meal_type: mealType,
    source: 'photo',
    food_name: name.trim(),
    portion_g: scaled(item.portion_grams),
    calories: scaled(item.est_calories),
    protein_g: scaled(item.est_protein_g),
    carbs_g: scaled(item.est_carbs_g),
    fat_g: scaled(item.est_fat_g),
    ai_guess: {
      name: item.name,
      portion_grams: item.portion_grams,
      est_calories: item.est_calories,
      est_protein_g: item.est_protein_g,
      est_carbs_g: item.est_carbs_g,
      est_fat_g: item.est_fat_g,
      confidence: item.confidence,
    },
  };
}

export function itemsToEntries(
  items: PhotoEstimateItem[],
  mealType: MealType,
): CreateFoodEntryInput[] {
  return items.map((item) => itemToEntry(item, mealType));
}
