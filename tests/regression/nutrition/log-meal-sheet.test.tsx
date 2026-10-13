/**
 * Issue #23 — "In the 'Log a meal' sheet the 'Nutrition label' tile does the same thing as 'Snap
 * the plate'. It sends the picture to the plate photo endpoint, so labels are read as food."
 * (`src/features/nutrition/components/LogMealSheet.tsx:201` wired `onPress={runPhoto}` on the
 * label tile, the same handler as Snap.) This protects: the label tile driving its own mutation
 * (not the photo one), the confirm hand-off tagging `source=label_ocr` with the label's own
 * values, the label-specific error fallback copy, and that Snap the plate keeps working.
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

  it("routes to confirm with source=label_ocr and the label's own values on a successful scan", async () => {
    mockAnalyzeLabelMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess(LABEL_ESTIMATE),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('source=label_ocr');
    expect(pushedUrl).not.toContain('source=photo');

    const prefillParam = new URLSearchParams(pushedUrl.split('?')[1]).get('prefill');
    expect(JSON.parse(prefillParam ?? '{}')).toEqual({
      food_name: 'Protein bar',
      calories: 210,
      protein_g: 20,
      carbs_g: 22,
      fat_g: 6,
    });
  });

  it("shows the API's own error copy and does not navigate when the label scan fails", async () => {
    mockAnalyzeLabelMutate.mockImplementation((_file, handlers) =>
      handlers.onError(
        new ApiError('unprocessable', 'validation', 422, {
          error: "Label couldn't be read. Enter your meal manually.",
        }),
      ),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Nutrition label/);

    await waitFor(() =>
      expect(screen.getByText("Label couldn't be read. Enter your meal manually.")).toBeTruthy(),
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
