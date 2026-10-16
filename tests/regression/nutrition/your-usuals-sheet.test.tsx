import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { Path } from 'react-native-svg';

import { YourUsualsSheet } from '@/features/nutrition/components/YourUsualsSheet';
import type { UsualsResponse } from '@/features/nutrition/schemas';
import { colors } from '@/shared/theme/tokens';

const mockMutate = jest.fn();
let mockResponse: UsualsResponse;
const mockUseUsualsQuery = jest.fn(() => ({
  data: mockResponse,
  isLoading: false,
  isError: false,
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useUsualsQuery: () => mockUseUsualsQuery(),
  useCreateFoodEntryMutation: () => ({ mutate: mockMutate, isPending: false }),
}));

const suggestions: UsualsResponse['suggestions'] = [
  {
    kind: 'repeat',
    food_name: 'Poha with peanuts + chai',
    meal_type: 'breakfast',
    calories: 380,
    protein_g: 12,
    carbs_g: 54,
    fat_g: 13,
    portion_g: 310,
    food_item: null,
    reason_label: 'Most weekday mornings',
    times_logged: 5,
    last_logged_on: '2026-10-15',
  },
  {
    kind: 'repeat',
    food_name: 'Masala omelette, two toasts',
    meal_type: 'breakfast',
    calories: 460,
    protein_g: 24,
    carbs_g: 39,
    fat_g: 22,
    portion_g: null,
    food_item: 7,
    reason_label: 'Most Tuesday mornings',
    times_logged: 3,
    last_logged_on: '2026-10-13',
  },
  {
    kind: 'yesterday',
    food_name: 'Idli, sambar, filter coffee',
    meal_type: 'breakfast',
    calories: 410,
    protein_g: 14,
    carbs_g: 68,
    fat_g: 9,
    portion_g: 420,
    food_item: null,
    reason_label: "Yesterday's breakfast again",
    times_logged: 1,
    last_logged_on: '2026-10-15',
  },
];

describe('nutrition: YourUsualsSheet (15b, issue #28)', () => {
  const onClose = jest.fn();
  const onSomethingNew = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = {
      meal_type: 'breakfast',
      observed_at: '2026-10-13T08:40:00+05:30',
      suggestions,
    };
  });

  function renderSheet(visible = true) {
    return render(
      <YourUsualsSheet
        visible={visible}
        mealType="breakfast"
        date="2026-10-16"
        onClose={onClose}
        onSomethingNew={onSomethingNew}
      />,
    );
  }

  it('renders the exact design copy and suggestion order', () => {
    renderSheet();

    const orderedCopy = [
      'Your usuals',
      '8:40 on a Tuesday.',
      'The usual?',
      'Poha with peanuts + chai',
      'Most weekday mornings · 380 kcal',
      'Masala omelette, two toasts',
      'Most Tuesday mornings · 460 kcal',
      "Yesterday's breakfast again",
      'Idli, sambar, filter coffee · 410 kcal',
      'I learned these from you. No forms, no "custom foods". Your repeats just show up.',
      'Something new instead',
    ];
    const text = screen.getAllByText(/.+/).map((node) =>
      Array.isArray(node.props.children)
        ? node.props.children
            .filter((child: unknown) => typeof child === 'string')
            .join('')
            .trim()
        : String(node.props.children),
    );
    let cursor = -1;
    for (const copy of orderedCopy) {
      const next = text.indexOf(copy, cursor + 1);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
    }
  });

  it('colors suggestion icons by highlighted row rather than suggestion kind', () => {
    mockResponse = {
      ...mockResponse,
      suggestions: [suggestions[2], suggestions[0]],
    };
    const view = renderSheet();

    const iconPaths = view
      .UNSAFE_getAllByType(Path)
      .filter((path) =>
        ['M1 4v6h6M3.5 15a9 9 0 1 0 2-9.5L1 10', 'M12 5v14M5 12h14'].includes(path.props.d),
      );
    expect(iconPaths.map((path) => path.props.stroke)).toEqual([colors.ink, colors.ink75]);
  });

  it('keeps the modal mounted with visible false so React Native can animate it closed', () => {
    const view = renderSheet();

    view.rerender(
      <YourUsualsSheet
        visible={false}
        mealType="breakfast"
        date="2026-10-16"
        onClose={onClose}
        onSomethingNew={onSomethingNew}
      />,
    );

    expect(view.UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  it('logs the suggestion fields unchanged as quick_add and closes after success', async () => {
    mockMutate.mockImplementation((_values, callbacks) => callbacks.onSuccess());
    renderSheet();

    fireEvent.press(screen.getByRole('button', { name: /log poha with peanuts \+ chai/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        food_name: suggestions[0].food_name,
        meal_type: suggestions[0].meal_type,
        calories: suggestions[0].calories,
        protein_g: suggestions[0].protein_g,
        carbs_g: suggestions[0].carbs_g,
        fat_g: suggestions[0].fat_g,
        portion_g: suggestions[0].portion_g,
        source: 'quick_add',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('opens the normal log flow without saving', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Something new instead' }));
    expect(onSomethingNew).toHaveBeenCalledTimes(1);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('closes from the back control without saving', () => {
    renderSheet();
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('renders nothing when there are no suggestions', () => {
    mockResponse = { ...mockResponse, suggestions: [] };
    renderSheet();
    expect(screen.queryByText('Your usuals')).toBeNull();
    expect(screen.queryByText('The usual?')).toBeNull();
  });
});
