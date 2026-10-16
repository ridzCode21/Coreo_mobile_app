/**
 * Issue #23 — "In the 'Log a meal' sheet the 'Nutrition label' tile does the same thing as 'Snap
 * the plate'. It sends the picture to the plate photo endpoint, so labels are read as food."
 * (`src/features/nutrition/components/LogMealSheet.tsx:201` wired `onPress={runPhoto}` on the
 * label tile, the same handler as Snap.) This protects: the label tile driving its own mutation
 * (not the photo one), the label-specific error fallback copy, and that Snap the plate keeps
 * working.
 *
 * Issue #26 — "Label scan result, servings and could-not-read screens" changed what a successful
 * or failed label scan does next: a readable label now routes to the 21c result screen
 * (`/diet/label-result`) instead of straight to Check My Math, and a 422 ("couldn't read it") now
 * routes to the 25d recovery screen (`/diet/label-unreadable`) instead of only showing an inline
 * notice. Other errors (e.g. the 429 daily-quota message) still show the inline notice — the
 * calm-recovery screen is only for "I couldn't read that label," per the design.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';
import { ApiError } from '@/shared/api/errors';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockCaptureMealPhotoFromCamera = jest.fn();
const mockPickMealPhotoFromLibrary = jest.fn();
jest.mock('@/features/nutrition/lib/photoCapture', () => ({
  captureMealPhotoFromCamera: (...args: unknown[]) => mockCaptureMealPhotoFromCamera(...args),
  pickMealPhotoFromLibrary: (...args: unknown[]) => mockPickMealPhotoFromLibrary(...args),
}));

let mockPhotoPending = false;
let mockLabelPending = false;
const mockAnalyzePhotoMutate = jest.fn();
const mockAnalyzeLabelMutate = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useAnalyzePhotoMutation: () => ({ mutate: mockAnalyzePhotoMutate, isPending: mockPhotoPending }),
  useAnalyzeLabelMutation: () => ({ mutate: mockAnalyzeLabelMutate, isPending: mockLabelPending }),
  useFoodSearchQuery: () => ({ data: undefined, isFetching: false, isError: false, error: null }),
}));

const FAKE_FILE = { uri: 'file://label.jpg', name: 'label.jpg', type: 'image/jpeg' };

const LABEL_ESTIMATE = {
  name: 'Protein bar',
  portion_grams: 60,
  est_calories: 210,
  est_protein_g: 20,
  est_carbs_g: 22,
  est_fat_g: 6,
  servings_per_container: 2.5,
  confidence: 0.95,
  guessed: false,
  guess_note: null,
  remembered: false,
};

function pressTile(name: RegExp) {
  fireEvent.press(screen.getByRole('button', { name }));
}

describe('nutrition: LogMealSheet (issue #23 — label tile must call label-ocr, not photo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhotoPending = false;
    mockLabelPending = false;
    mockCaptureMealPhotoFromCamera.mockResolvedValue({ status: 'ok', file: FAKE_FILE });
  });

  it('calls the label-scan mutation (not the photo mutation) when "Nutrition label" is pressed', async () => {
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() =>
      expect(mockAnalyzeLabelMutate).toHaveBeenCalledWith(FAKE_FILE, expect.anything()),
    );
    expect(mockAnalyzePhotoMutate).not.toHaveBeenCalled();
  });

  it('routes to the label result screen (21c) with the full label estimate on a successful scan (#26)', async () => {
    mockAnalyzeLabelMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess(LABEL_ESTIMATE),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/label-result');

    const prefillParam = new URLSearchParams(pushedUrl.split('?')[1]).get('prefill');
    expect(JSON.parse(prefillParam ?? '{}')).toEqual(LABEL_ESTIMATE);
  });

  it("routes to the could-not-read screen (25d) on a 422 'unreadable label' response, without logging anything (#26)", async () => {
    mockAnalyzeLabelMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('unprocessable', 'validation', 422, {
          error: "I couldn't read that label.",
          message: "Too blurry, maybe. Describe it and I've got you.",
        }),
      ),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/label-unreadable');
    expect(screen.queryByText(/couldn't read/i)).toBeNull(); // no inline notice — the 25d screen owns that copy
  });

  it('still shows the inline notice (does not navigate to 25d) for a non-422 label error, e.g. the daily quota (#26)', async () => {
    mockAnalyzeLabelMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('rate_limited', 'unknown', 429, {
          error: 'Daily label scan limit reached. Enter meal manually.',
        }),
      ),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() =>
      expect(screen.getByText('Daily label scan limit reached. Enter meal manually.')).toBeTruthy(),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('still calls the photo mutation (not label) when "Snap the plate" is pressed', async () => {
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Snap the plate/);

    await waitFor(() =>
      expect(mockAnalyzePhotoMutate).toHaveBeenCalledWith(FAKE_FILE, expect.anything()),
    );
    expect(mockAnalyzeLabelMutate).not.toHaveBeenCalled();
  });

  it('shows a reading-the-label pending state while the label scan is in flight', () => {
    mockLabelPending = true;
    render(<LogMealSheet visible onClose={jest.fn()} />);
    expect(screen.getByText(/reading.*label/i)).toBeTruthy();
  });
});
