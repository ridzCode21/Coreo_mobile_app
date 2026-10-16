/**
 * Issue #38 — design 32c "Add a food" and 32d "Search" have no entry point of their own (the
 * natural one, 32a "My foods", is blocked on a missing backend list endpoint — see plan.md
 * Decision log #1/#2). This adds two tiles to the existing "What are we logging?" sheet
 * (LogMealSheet, design 14b) that open the two new screens, closing the sheet first the same way
 * every other tile does (see `openScanner` in LogMealSheet.tsx).
 */
import { render, screen, fireEvent } from '@testing-library/react-native';

import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/features/nutrition/lib/photoCapture', () => ({
  captureMealPhotoFromCamera: jest.fn(),
  pickMealPhotoFromLibrary: jest.fn(),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useAnalyzePhotoMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useAnalyzeLabelMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useFoodSearchQuery: () => ({ data: undefined, isFetching: false, isError: false, error: null }),
}));

function pressTile(name: RegExp) {
  fireEvent.press(screen.getByRole('button', { name }));
}

describe('nutrition: LogMealSheet gains Search / Add a food tiles (issue #38)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes the sheet and opens the standalone Search screen', () => {
    const onClose = jest.fn();
    render(<LogMealSheet visible onClose={onClose} />);

    pressTile(/^Search/);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/diet/food-search');
  });

  it('closes the sheet and opens the Add a food screen', () => {
    const onClose = jest.fn();
    render(<LogMealSheet visible onClose={onClose} />);

    pressTile(/^Add a food/);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/diet/add-food');
  });
});
