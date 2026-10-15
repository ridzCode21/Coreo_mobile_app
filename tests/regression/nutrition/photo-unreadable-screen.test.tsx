/**
 * Issue #27 — screen 25a "Couldn't read the plate" (design-spec.md lines 7-85; design file lines
 * 2824-2872). Protects: exact design copy and element order, the literal-copy fallback when route
 * params are missing/invalid (never a blank screen), the "Your usuals" chips sourced from
 * `GET /food/usuals/` via `useUsualsQuery` (absent when loading/empty — no invented placeholders),
 * and the three interactions: back → `/diet`, "Describe it" → `/diet/confirm` with only
 * `meal_type` prefilled, and "Try another photo" re-running capture with the right destination on
 * success / a fresh 422 / any other failure.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';

import PhotoUnreadableScreen from '@/features/nutrition/screens/PhotoUnreadableScreen';
import { ApiError } from '@/shared/api/errors';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockCaptureMealPhotoFromCamera = jest.fn();
const mockPickMealPhotoFromLibrary = jest.fn();
jest.mock('@/features/nutrition/lib/photoCapture', () => ({
  captureMealPhotoFromCamera: (...args: unknown[]) => mockCaptureMealPhotoFromCamera(...args),
  pickMealPhotoFromLibrary: (...args: unknown[]) => mockPickMealPhotoFromLibrary(...args),
}));

const mockAnalyzePhotoMutate = jest.fn();
let mockUsualsResult: {
  data?: { suggestions: { food_name: string }[] };
  isLoading: boolean;
  isSuccess: boolean;
} = { data: undefined, isLoading: true, isSuccess: false };
const mockUseUsualsQuery = jest.fn((_mealType: string) => mockUsualsResult);
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useAnalyzePhotoMutation: () => ({ mutate: mockAnalyzePhotoMutate, isPending: false }),
  useUsualsQuery: (mealType: string) => mockUseUsualsQuery(mealType),
}));

const FAKE_FILE = { uri: 'file://plate2.jpg', name: 'plate2.jpg', type: 'image/jpeg' };

const USUALS_SUCCESS = {
  data: {
    suggestions: [
      { food_name: 'Rice bowl, paneer' },
      { food_name: 'Dal, roti, salad' },
      { food_name: 'Protein shake' },
    ],
  },
  isLoading: false,
  isSuccess: true,
};

function setParams(overrides: Record<string, string | undefined> = {}) {
  mockSearchParams = {
    title: "I couldn't read that plate.",
    message: "Too dark, maybe. Describe it and I've got you.",
    mealType: 'lunch',
    ...overrides,
  };
}

describe('nutrition: PhotoUnreadableScreen (25a, issue #27)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsualsResult = USUALS_SUCCESS;
    mockCaptureMealPhotoFromCamera.mockResolvedValue({ status: 'ok', file: FAKE_FILE });
    setParams();
  });

  it('renders the exact design copy in order, including the usual chips from useUsualsQuery', () => {
    render(<PhotoUnreadableScreen />);

    expect(screen.getByText('Snap · Lunch')).toBeTruthy();
    expect(screen.getByText("I couldn't read that plate.")).toBeTruthy();
    expect(screen.getByText("Too dark, maybe. Describe it and I've got you.")).toBeTruthy();
    expect(screen.getByText('Describe it')).toBeTruthy();
    expect(screen.getByText('Type or talk it out')).toBeTruthy();
    expect(screen.getByText('Your usuals')).toBeTruthy();
    expect(screen.getByText('Rice bowl, paneer')).toBeTruthy();
    expect(screen.getByText('Dal, roti, salad')).toBeTruthy();
    expect(screen.getByText('Protein shake')).toBeTruthy();
    expect(screen.getByText('Try another photo')).toBeTruthy();
    expect(screen.getByText('Nothing was logged yet.')).toBeTruthy();
  });

  it("renders the broken-photo placeholder with the design's near-vertical 160-degree gradient", () => {
    render(<PhotoUnreadableScreen />);

    const placeholder = screen
      .UNSAFE_getAllByType(LinearGradient)
      .find(({ props }) => props.colors[0] === '#6E7A85' && props.colors[1] === '#454F58');

    expect(placeholder).toBeDefined();
    expect(placeholder?.props.start).toEqual({ x: 0.32, y: 0 });
    expect(placeholder?.props.end).toEqual({ x: 0.68, y: 1 });
  });

  it('falls back to the literal design copy when title/message route params are missing', () => {
    setParams({ title: undefined, message: undefined });
    render(<PhotoUnreadableScreen />);

    expect(screen.getByText("I couldn't read that plate.")).toBeTruthy();
    expect(screen.getByText("Too dark, maybe. Describe it and I've got you.")).toBeTruthy();
  });

  it('shows the eyebrow for the mealType param (not always "Lunch")', () => {
    setParams({ mealType: 'breakfast' });
    render(<PhotoUnreadableScreen />);

    expect(screen.getByText('Snap · Breakfast')).toBeTruthy();
  });

  it('hides the "Your usuals" block entirely while loading or when there are zero suggestions', () => {
    mockUsualsResult = { data: undefined, isLoading: true, isSuccess: false };
    render(<PhotoUnreadableScreen />);
    expect(screen.queryByText('Your usuals')).toBeNull();

    mockUsualsResult = { data: { suggestions: [] }, isLoading: false, isSuccess: true };
    render(<PhotoUnreadableScreen />);
    expect(screen.queryAllByText('Your usuals')).toHaveLength(0);
  });

  it('calls GET /food/usuals/ (via useUsualsQuery) with the current meal type', () => {
    setParams({ mealType: 'dinner' });
    render(<PhotoUnreadableScreen />);
    expect(mockUseUsualsQuery).toHaveBeenCalledWith('dinner');
  });

  it('tapping the back control navigates to /diet', () => {
    render(<PhotoUnreadableScreen />);
    fireEvent.press(screen.getByRole('button', { name: /go back/i }));
    expect(mockReplace).toHaveBeenCalledWith('/diet');
  });

  it('tapping "Describe it" navigates to /diet/confirm with source=manual and only meal_type prefilled', () => {
    render(<PhotoUnreadableScreen />);
    fireEvent.press(screen.getByRole('button', { name: /describe it/i }));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const pushedUrl = String(mockReplace.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/confirm');
    expect(pushedUrl).toContain('source=manual');
    const prefill = JSON.parse(new URLSearchParams(pushedUrl.split('?')[1]).get('prefill')!);
    expect(prefill).toEqual({ meal_type: 'lunch' });
  });

  it('"Try another photo" pushes to the photo result screen on a successful re-capture', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess({
        name: 'Dal, roti, salad',
        est_calories: 520,
        est_protein_g: 20,
        est_carbs_g: 60,
        est_fat_g: 15,
        guessed_count: 0,
        items: [],
      }),
    );
    render(<PhotoUnreadableScreen />);

    fireEvent.press(screen.getByRole('button', { name: /try another photo/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(String(mockPush.mock.calls[0][0])).toContain('/diet/photo-result');
  });

  it('"Try another photo" replaces to the same screen with new copy on a fresh 422', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('unprocessable', 'validation', 422, {
          error: "I couldn't read that plate.",
          message: "Too dark, maybe. Describe it and I've got you.",
        }),
      ),
    );
    render(<PhotoUnreadableScreen />);

    fireEvent.press(screen.getByRole('button', { name: /try another photo/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const replacedUrl = String(
      mockReplace.mock.calls.find((call) =>
        String(call[0]).includes('/diet/photo-unreadable'),
      )?.[0],
    );
    expect(replacedUrl).toContain('/diet/photo-unreadable');
  });

  it('"Try another photo" replaces to /diet on any other failure (e.g. 429 quota)', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('too many requests', 'unknown', 429, {
          error: 'Daily photo limit reached. Enter meal manually.',
        }),
      ),
    );
    render(<PhotoUnreadableScreen />);

    fireEvent.press(screen.getByRole('button', { name: /try another photo/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/diet'));
  });
});
