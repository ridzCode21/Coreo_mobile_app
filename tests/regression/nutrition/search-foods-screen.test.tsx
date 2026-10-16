/**
 * Issue #38, design 32d "Search" (design-spec.md lines 208-277). A standalone, full-screen
 * search — today search only exists inside the "Log a meal" sheet (LogMealSheet /
 * FoodSearchList), with no "Tap a result to log it." framing and no source labels. Reached via
 * `(app)/(tabs)/diet/food-search`. Tapping a row scales the per-100g macros to a 100 g portion
 * (same math as LogMealSheet.tsx's existing `onPickSearchResult`, lib/macros.ts `scalePer100g`)
 * and hands off to the confirm screen with `source=manual`, exactly like the existing
 * search-to-confirm path.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';

import SearchFoodsScreen from '@/app/(app)/(tabs)/diet/food-search';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

type MockQueryState = {
  data: unknown[] | undefined;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
};

let mockQueryState: MockQueryState = {
  data: undefined,
  isFetching: false,
  isError: false,
  error: null,
};

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useFoodSearchQuery: () => mockQueryState,
}));

const CATALOG_ITEM = {
  id: 1,
  barcode: null,
  name: 'Grilled chicken breast',
  calories_per_100g: 165,
  protein_g_per_100g: 31,
  carbs_g_per_100g: 0,
  fat_g_per_100g: 4,
  source: 'off',
  last_fetched: '2026-07-01T00:00:00Z',
};

const CUSTOM_ITEM = {
  id: 2,
  barcode: null,
  name: "Mom's chicken curry",
  calories_per_100g: 210,
  protein_g_per_100g: 12,
  carbs_g_per_100g: 8,
  fat_g_per_100g: 14,
  source: 'custom',
  last_fetched: '2026-07-01T00:00:00Z',
};

function typeQuery(text: string) {
  fireEvent.changeText(screen.getByTestId('food-search-input'), text);
}

describe('nutrition: SearchFoodsScreen (issue #38, design 32d)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryState = { data: undefined, isFetching: false, isError: false, error: null };
  });

  it('shows the exact design header and subtitle', () => {
    render(<SearchFoodsScreen />);
    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByText('Tap a result to log it.')).toBeTruthy();
  });

  it('uses the design typography for search input text', () => {
    render(<SearchFoodsScreen />);

    expect(screen.getByTestId('food-search-input')).toHaveStyle({
      fontSize: 13,
      fontFamily: 'Poppins_400Regular',
      letterSpacing: 0,
      color: 'rgba(23,25,29,0.85)',
    });
  });

  it('shows no results while the query is empty', () => {
    mockQueryState = { data: [CATALOG_ITEM], isFetching: false, isError: false, error: null };
    render(<SearchFoodsScreen />);
    expect(screen.queryByText('Grilled chicken breast')).toBeNull();
  });

  it('shows a loading state while fetching', () => {
    mockQueryState = { data: undefined, isFetching: true, isError: false, error: null };
    render(<SearchFoodsScreen />);
    typeQuery('chicken');
    expect(screen.getByText('Looking that up…')).toBeTruthy();
  });

  it('shows calm copy, never red, when the food database is down (503)', () => {
    const { ApiError } = jest.requireActual('@/shared/api/errors');
    mockQueryState = {
      data: undefined,
      isFetching: false,
      isError: true,
      error: new ApiError('down', 'server', 503),
    };
    render(<SearchFoodsScreen />);
    typeQuery('chicken');
    expect(screen.getByText("That lookup's down for a moment — type it out instead.")).toBeTruthy();
  });

  it("shows the OpenFoodFacts pill on a catalog row and not on the user's own food", () => {
    mockQueryState = {
      data: [CATALOG_ITEM, CUSTOM_ITEM],
      isFetching: false,
      isError: false,
      error: null,
    };
    render(<SearchFoodsScreen />);
    typeQuery('chicken');

    expect(screen.getByText('Grilled chicken breast')).toBeTruthy();
    expect(screen.getByText("Mom's chicken curry")).toBeTruthy();
    expect(screen.getAllByText('OpenFoodFacts')).toHaveLength(1);
  });

  it('tapping a result navigates to confirm with the macros scaled to 100g and source=manual', () => {
    mockQueryState = { data: [CATALOG_ITEM], isFetching: false, isError: false, error: null };
    render(<SearchFoodsScreen />);
    typeQuery('chicken');

    fireEvent.press(screen.getByRole('button', { name: /Pick Grilled chicken breast/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url.startsWith('/diet/confirm?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('source')).toBe('manual');
    expect(JSON.parse(params.get('prefill') as string)).toEqual({
      food_name: 'Grilled chicken breast',
      calories: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 4,
    });
  });

  it('the back control returns without navigating forward', () => {
    render(<SearchFoodsScreen />);
    fireEvent.press(screen.getByRole('button', { name: /back/i }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
