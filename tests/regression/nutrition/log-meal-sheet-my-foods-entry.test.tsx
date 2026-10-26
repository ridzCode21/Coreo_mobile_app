/**
 * Issue #38 — design 32c "Add a food" and 32d "Search" have no entry point of their own. Round 1
 * added two tiles to the existing "What are we logging?" sheet (LogMealSheet, design 14b) that
 * open those two screens, closing the sheet first the same way every other tile does (see
 * `openScanner` in LogMealSheet.tsx). Round 2 adds a third tile for 32a "My foods" — blocked last
 * round on a missing backend list endpoint (plan.md Decision log #1/#2), now shipped
 * (apps/food_tracking/views.py:107-114). None of 32a/32b/32c/32d show a screen that links to 32a
 * itself, so this reuses the exact same precedent as the first two tiles rather than inventing a
 * new pattern (see plan.md Decision log).
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Path } from 'react-native-svg';

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

  it('closes the sheet and opens the My foods screen (issue #38 round 2)', () => {
    const onClose = jest.fn();
    render(<LogMealSheet visible onClose={onClose} />);

    pressTile(/^My foods/);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/diet/my-foods');
  });

  it('uses a saved-foods icon distinct from the Add a food plus icon', () => {
    render(<LogMealSheet visible onClose={jest.fn()} />);

    expect(screen.getByRole('button', { name: /^My foods/ }).findByType(Path).props.d).toBe(
      'M5 4h11a2 2 0 0 1 2 2v14l-3.5-2-3.5 2-3.5-2L5 20V6a2 2 0 0 1 2-2Z',
    );
  });
});
