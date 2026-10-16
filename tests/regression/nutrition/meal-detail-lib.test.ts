import { costTierLabel, recipeRefusedFrom } from '@/features/nutrition/lib/mealDetail';
import { ApiError } from '@/shared/api/errors';

describe('meal detail helpers', () => {
  it.each([
    ['budget_friendly', 'Budget-friendly cost'],
    ['moderate', 'Moderate cost'],
    ['premium', 'Premium cost'],
  ] as const)('labels the %s cost tier', (tier, expected) => {
    expect(costTierLabel(tier)).toBe(expected);
  });

  it('maps recipe_check_failed to the fixed design copy', () => {
    expect(
      recipeRefusedFrom(
        new ApiError('That request could not be validated.', 'validation', 422, {
          error: 'recipe_check_failed',
          message: 'Backend detail',
        }),
      ),
    ).toEqual({
      title: "I couldn't write this one honestly.",
      message:
        "The steps didn't match the meal as planned. Nothing logged, nothing lost — the meal above is unchanged.",
    });
  });

  it.each([
    new Error('network'),
    new ApiError('Other validation error', 'validation', 422, { error: 'other' }),
    new ApiError('Quota', 'unknown', 429, { error: 'quota_exceeded' }),
  ])('does not treat another error as a recipe refusal', (error) => {
    expect(recipeRefusedFrom(error)).toBeNull();
  });
});
