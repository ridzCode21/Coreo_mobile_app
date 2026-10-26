/**
 * Issue #38, round 2 — design 32a "My foods" and 32b "My foods · empty"
 * (design-spec.md lines 7-126). Blocked last round because `GET /food/items/` didn't exist yet
 * (plan.md Decision log #1); it now does (apps/food_tracking/views.py:107-114), so this screen is
 * buildable. One screen, two states, driven entirely by `useFoodItemsQuery()`: `data.length === 0`
 * renders 32b, otherwise 32a. Reached via `(app)/(tabs)/diet/my-foods`. The "+" header control on
 * 32a and the "Add a food" button on 32b both open the existing 32c screen
 * (`(app)/(tabs)/diet/add-food`, already built — see add-food-screen.test.tsx).
 */
import { render, screen, fireEvent } from '@testing-library/react-native';

import MyFoodsScreen from '@/app/(app)/(tabs)/diet/my-foods';
import { componentSizes, radii } from '@/shared/theme/tokens';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

type MockQueryState = {
  data: unknown[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

let mockQueryState: MockQueryState = { data: undefined, isLoading: true, isError: false };

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useFoodItemsQuery: () => mockQueryState,
}));

const MOMS_DAL = {
  id: 1,
  barcode: null,
  name: "Mom's dal",
  calories_per_100g: 182,
  protein_g_per_100g: 9,
  carbs_g_per_100g: 22,
  fat_g_per_100g: 6,
  source: 'custom',
  last_fetched: '2026-07-01T00:00:00Z',
};

const PROTEIN_OATS = {
  id: 2,
  barcode: null,
  name: 'Protein overnight oats',
  calories_per_100g: 156,
  protein_g_per_100g: 11,
  carbs_g_per_100g: 19,
  fat_g_per_100g: 4,
  source: 'custom',
  last_fetched: '2026-07-01T00:00:00Z',
};

describe('nutrition: MyFoodsScreen (issue #38, design 32a/32b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryState = { data: undefined, isLoading: true, isError: false };
  });

  it('shows a loading state while fetching', () => {
    mockQueryState = { data: undefined, isLoading: true, isError: false };
    render(<MyFoodsScreen />);
    expect(screen.getByLabelText(/loading your foods/i)).toBeTruthy();
  });

  it('shows calm copy on a load failure, never red, with no foods invented', () => {
    mockQueryState = { data: undefined, isLoading: false, isError: true };
    render(<MyFoodsScreen />);
    expect(screen.getByText(/couldn't load your foods/i)).toBeTruthy();
    expect(screen.queryByText('No custom foods yet')).toBeNull();
  });

  describe('empty state (32b)', () => {
    beforeEach(() => {
      mockQueryState = { data: [], isLoading: false, isError: false };
    });

    it('shows the exact design copy', () => {
      render(<MyFoodsScreen />);
      expect(screen.getByText('My foods')).toBeTruthy();
      expect(screen.getByText('No custom foods yet')).toBeTruthy();
      expect(
        screen.getByText(
          "Save your own recipes and staples with their macros. I'll remember them in Search and while logging.",
        ),
      ).toBeTruthy();
    });

    it('uses the design body width and button radius', () => {
      render(<MyFoodsScreen />);

      expect(
        screen.getByText(
          "Save your own recipes and staples with their macros. I'll remember them in Search and while logging.",
        ).props.style,
      ).toEqual(expect.objectContaining({ maxWidth: componentSizes.myFoodsEmptyBodyMaxWidth }));
      expect(screen.getByRole('button', { name: 'Add a food' }).props.style).toEqual(
        expect.objectContaining({ borderRadius: radii.xl }),
      );
    });

    it('the "Add a food" button opens the add-food screen', () => {
      render(<MyFoodsScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Add a food' }));
      expect(mockPush).toHaveBeenCalledWith('/diet/add-food');
    });
  });

  describe('list state (32a)', () => {
    beforeEach(() => {
      mockQueryState = { data: [MOMS_DAL, PROTEIN_OATS], isLoading: false, isError: false };
    });

    it('shows the exact design header, subtitle and footer count', () => {
      render(<MyFoodsScreen />);
      expect(screen.getByText('My foods')).toBeTruthy();
      expect(screen.getByText('Yours, kept separate from the shared catalog.')).toBeTruthy();
      expect(screen.getByText('2 foods · only you can see these')).toBeTruthy();
    });

    it('renders each row with its exact macro line, per the design format', () => {
      render(<MyFoodsScreen />);
      expect(screen.getByText("Mom's dal")).toBeTruthy();
      expect(
        screen.getByText('182 kcal · 9g protein · 22g carbs · 6g fat — per 100g'),
      ).toBeTruthy();
      expect(screen.getByText('Protein overnight oats')).toBeTruthy();
      expect(
        screen.getByText('156 kcal · 11g protein · 19g carbs · 4g fat — per 100g'),
      ).toBeTruthy();
    });

    it('singular "food" count for exactly one saved food', () => {
      mockQueryState = { data: [MOMS_DAL], isLoading: false, isError: false };
      render(<MyFoodsScreen />);
      expect(screen.getByText('1 food · only you can see these')).toBeTruthy();
    });

    it('the header "+" control opens the add-food screen', () => {
      render(<MyFoodsScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Add a food' }));
      expect(mockPush).toHaveBeenCalledWith('/diet/add-food');
    });

    it('the back control returns without navigating forward', () => {
      render(<MyFoodsScreen />);
      fireEvent.press(screen.getByRole('button', { name: /go back/i }));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
