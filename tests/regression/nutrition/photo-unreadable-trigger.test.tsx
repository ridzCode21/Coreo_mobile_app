/**
 * Issue #27 — "Plate could not be read screen with usuals." Today a failed plate photo
 * (`POST /food/photo/` → 422, `apps/food_tracking/views.py:280-283` → `_vision_failure_response`,
 * `views.py:320-325`) only sets an inline notice inside the "Log a meal" sheet
 * (`LogMealSheet.tsx:165-166,221`) with copy that doesn't even match the backend's own wording. The
 * design (25a, design-spec.md) shows a dedicated full-screen state instead. This protects the
 * trigger: a 422 from the photo endpoint must close the sheet and navigate to
 * `/diet/photo-unreadable` carrying the backend's own `error`/`message` copy and the current meal
 * type; every other failure (429 quota, or anything else) must keep today's inline-notice behavior
 * unchanged and never navigate.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';
import { ApiError } from '@/shared/api/errors';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCaptureMealPhotoFromCamera = jest.fn();
const mockPickMealPhotoFromLibrary = jest.fn();
jest.mock('@/features/nutrition/lib/photoCapture', () => ({
  captureMealPhotoFromCamera: (...args: unknown[]) => mockCaptureMealPhotoFromCamera(...args),
  pickMealPhotoFromLibrary: (...args: unknown[]) => mockPickMealPhotoFromLibrary(...args),
}));

let mockPhotoPending = false;
const mockAnalyzePhotoMutate = jest.fn();
const mockAnalyzeLabelMutate = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useAnalyzePhotoMutation: () => ({ mutate: mockAnalyzePhotoMutate, isPending: mockPhotoPending }),
  useAnalyzeLabelMutation: () => ({ mutate: mockAnalyzeLabelMutate, isPending: false }),
  useFoodSearchQuery: () => ({ data: undefined, isFetching: false, isError: false, error: null }),
}));

const FAKE_FILE = { uri: 'file://plate.jpg', name: 'plate.jpg', type: 'image/jpeg' };

function pressSnap() {
  fireEvent.press(screen.getByRole('button', { name: /^Snap the plate/ }));
}

describe('nutrition: LogMealSheet photo-422 trigger (issue #27)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhotoPending = false;
    mockCaptureMealPhotoFromCamera.mockResolvedValue({ status: 'ok', file: FAKE_FILE });
    jest.useFakeTimers().setSystemTime(new Date('2026-10-16T13:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("closes the sheet and navigates to /diet/photo-unreadable with the backend's title, message and current meal type on a 422", async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('unprocessable', 'validation', 422, {
          error: "I couldn't read that plate.",
          message: "Too dark, maybe. Describe it and I've got you.",
        }),
      ),
    );
    const onClose = jest.fn();
    render(<LogMealSheet visible onClose={onClose} />);

    pressSnap();

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/photo-unreadable');
    const params = new URLSearchParams(pushedUrl.split('?')[1]);
    expect(params.get('title')).toBe("I couldn't read that plate.");
    expect(params.get('message')).toBe("Too dark, maybe. Describe it and I've got you.");
    expect(params.get('mealType')).toBe('lunch');
  });

  it('does not show the inline notice when a 422 navigates to the new screen', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('unprocessable', 'validation', 422, {
          error: "I couldn't read that plate.",
          message: "Too dark, maybe. Describe it and I've got you.",
        }),
      ),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressSnap();

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(screen.queryByText("I couldn't read that plate.")).toBeNull();
    expect(
      screen.queryByText("I couldn't read that one. Describe it and I'll do the math."),
    ).toBeNull();
  });

  it('keeps the existing inline notice and does not navigate on a 429 (daily quota) photo error', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('too many requests', 'unknown', 429, {
          error: 'Daily photo limit reached. Enter meal manually.',
        }),
      ),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressSnap();

    await waitFor(() =>
      expect(screen.getByText('Daily photo limit reached. Enter meal manually.')).toBeTruthy(),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
