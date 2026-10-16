/**
 * Issue #38 — `FoodSearchList` gains an opt-in `showSourceLabel` prop so the new full-screen
 * Search (32d) can show the design's "OpenFoodFacts" pill on catalog rows while the existing
 * in-sheet usage (LogMealSheet, design 14b) stays visually unchanged (that screen's design does
 * not show source pills).
 */
import { render, screen } from '@testing-library/react-native';

import { FoodSearchList } from '@/features/nutrition/components/FoodSearchList';

const RESULTS = [
  {
    id: 1,
    barcode: null,
    name: 'Grilled chicken breast',
    calories_per_100g: 165,
    protein_g_per_100g: 31,
    carbs_g_per_100g: 0,
    fat_g_per_100g: 4,
    source: 'off',
    last_fetched: '2026-07-01T00:00:00Z',
  },
  {
    id: 2,
    barcode: null,
    name: "Mom's chicken curry",
    calories_per_100g: 210,
    protein_g_per_100g: 12,
    carbs_g_per_100g: 8,
    fat_g_per_100g: 14,
    source: 'custom',
    last_fetched: '2026-07-01T00:00:00Z',
  },
];

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useFoodSearchQuery: () => ({
    data: RESULTS,
    isFetching: false,
    isError: false,
    error: null,
  }),
}));

describe('nutrition: FoodSearchList showSourceLabel (issue #38)', () => {
  it('shows the OpenFoodFacts pill on catalog rows only when showSourceLabel is true', () => {
    render(<FoodSearchList query="chicken" onPick={jest.fn()} showSourceLabel />);

    expect(screen.getByText('Grilled chicken breast')).toBeTruthy();
    expect(screen.getAllByText('OpenFoodFacts')).toHaveLength(1);
    expect(screen.getByText('OpenFoodFacts')).toHaveStyle({ borderRadius: 8 });
  });

  it('uses the design opacity for full-screen result metadata', () => {
    render(<FoodSearchList query="chicken" onPick={jest.fn()} showSourceLabel />);

    expect(screen.getByText('165 kcal / 100g')).toHaveStyle({
      color: 'rgba(23,25,29,0.55)',
    });
  });

  it('shows no pill at all when showSourceLabel is omitted (existing LogMealSheet usage)', () => {
    render(<FoodSearchList query="chicken" onPick={jest.fn()} />);

    expect(screen.getByText('Grilled chicken breast')).toBeTruthy();
    expect(screen.queryByText('OpenFoodFacts')).toBeNull();
  });

  it('never shows the pill on a custom (own) food even with showSourceLabel true', () => {
    render(<FoodSearchList query="chicken" onPick={jest.fn()} showSourceLabel />);

    expect(screen.getByText("Mom's chicken curry")).toBeTruthy();
    expect(screen.getAllByText('OpenFoodFacts')).toHaveLength(1); // only the catalog row
  });
});
