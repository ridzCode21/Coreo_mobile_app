/**
 * Issue #38, design 32c "Add a food" (design-spec.md lines 133-201). Saves a user-owned food via
 * `POST /food/items/` (apps/food_tracking/views.py:107-122) — name + four per-100g macros only;
 * no barcode field exists on this screen (serializers.py:67-95 makes barcode optional). Reached
 * via `(app)/(tabs)/diet/add-food`.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import AddFoodScreen from '@/app/(app)/(tabs)/diet/add-food';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockMutate = jest.fn();
let mockPending = false;
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useCreateFoodItemMutation: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

function fillForm() {
  fireEvent.changeText(screen.getByTestId('add-food-name'), "Mom's dal");
  fireEvent.changeText(screen.getByTestId('add-food-calories'), '182');
  fireEvent.changeText(screen.getByTestId('add-food-protein'), '9');
  fireEvent.changeText(screen.getByTestId('add-food-carbs'), '22');
  fireEvent.changeText(screen.getByTestId('add-food-fat'), '6');
}

function submit() {
  fireEvent.press(screen.getByRole('button', { name: 'Save to my foods' }));
}

describe('nutrition: AddFoodScreen (issue #38, design 32c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPending = false;
  });

  it('renders the exact design copy', () => {
    render(<AddFoodScreen />);
    expect(screen.getByText('Add a food')).toBeTruthy();
    expect(screen.getByText("Per 100 grams — I'll scale it wherever you use it.")).toBeTruthy();
    expect(screen.getByText('Calories')).toBeTruthy();
    expect(screen.getByText('Protein')).toBeTruthy();
    expect(screen.getByText('Carbs')).toBeTruthy();
    expect(screen.getByText('Fat')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.getAllByText('g')).toHaveLength(3);
    expect(screen.getByText('Save to my foods')).toBeTruthy();
  });

  it('keeps the name in the design typography', () => {
    render(<AddFoodScreen />);

    expect(screen.getByTestId('add-food-name')).toHaveStyle({
      fontSize: 13,
      fontFamily: 'Poppins_400Regular',
      letterSpacing: 0,
      color: 'rgba(23,25,29,0.85)',
    });
  });

  it('keeps the macro units lowercase in the design typography', () => {
    render(<AddFoodScreen />);

    expect(screen.getByText('kcal')).toHaveStyle({
      fontSize: 10,
      fontFamily: 'Poppins_300Light',
      letterSpacing: 0,
    });
    expect(screen.getAllByText('g')[0]).toHaveStyle({
      fontSize: 10,
      fontFamily: 'Poppins_300Light',
      letterSpacing: 0,
    });
  });

  it('does not submit a blank form', () => {
    render(<AddFoodScreen />);
    submit();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('rejects a negative macro value without calling the API', () => {
    render(<AddFoodScreen />);
    fillForm();
    fireEvent.changeText(screen.getByTestId('add-food-protein'), '-5');
    submit();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits exactly the fields the backend accepts — no barcode, no owner, no source', () => {
    render(<AddFoodScreen />);
    fillForm();
    submit();

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const payload = mockMutate.mock.calls[0][0];
    expect(payload).toEqual({
      name: "Mom's dal",
      calories_per_100g: 182,
      protein_g_per_100g: 9,
      carbs_g_per_100g: 22,
      fat_g_per_100g: 6,
    });
  });

  it('goes back after a successful save', async () => {
    mockMutate.mockImplementation((_values, options) => {
      options?.onSuccess?.({});
    });
    render(<AddFoodScreen />);
    fillForm();
    submit();

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('shows a calm, non-red message on a server error and keeps the form usable', async () => {
    const { ApiError } = jest.requireActual('@/shared/api/errors');
    mockMutate.mockImplementation((_values, options) => {
      options?.onError?.(new ApiError('bad', 'validation', 400, { barcode: ['dup'] }));
    });
    render(<AddFoodScreen />);
    fillForm();
    submit();

    await waitFor(() => expect(screen.getByText(/couldn.t save/i)).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText('Save to my foods')).toBeTruthy();
  });

  it('shows a pending state while saving', () => {
    mockPending = true;
    render(<AddFoodScreen />);
    fillForm();
    expect(screen.queryByText('Save to my foods')).toBeNull();
  });
});
