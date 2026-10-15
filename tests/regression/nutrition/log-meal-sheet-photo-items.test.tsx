/**
 * Issue #24 — the "Snap the plate" flow analyzes a photo then hands off via a `prefill` JSON blob
 * (`LogMealSheet.tsx`, `analyzePhotoAndConfirm`). This protects: `items` reaching the `prefill` query
 * param untouched, and the existing aggregate fields still being forwarded (no regression for a
 * response with no items, e.g. if items is ever empty).
 *
 * Issue #25 — "After the snap screens for photo and receipt." The hand-off destination changes from
 * going straight to Check My Math (`/diet/confirm`) to the new 21a result screen (`/diet/photo-result`)
 * first; the prefill also now carries `guessed_count` so 21a can decide whether to show the
 * "One thing I couldn't see" card (`apps/core/services/inference.py:119-128,271` — `guessed_count` is
 * the only server-computed signal for this; there's no top-level `guess_note`).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { LogMealSheet } from '@/features/nutrition/components/LogMealSheet';

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

const mockAnalyzePhotoMutate = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useAnalyzePhotoMutation: () => ({ mutate: mockAnalyzePhotoMutate, isPending: false }),
  useAnalyzeLabelMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useFoodSearchQuery: () => ({ data: undefined, isFetching: false, isError: false, error: null }),
}));

const FAKE_FILE = { uri: 'file://plate.jpg', name: 'plate.jpg', type: 'image/jpeg' };

const PHOTO_ITEM = {
  name: 'Steamed rice',
  portion_label: '1 cup',
  portion_grams: 150,
  est_calories: 205,
  est_protein_g: 4,
  est_carbs_g: 45,
  est_fat_g: 1,
  confidence: 0.9,
  guessed: false,
  guess_note: null,
  remembered: false,
};

const PHOTO_ESTIMATE = {
  name: 'Rice bowl, paneer, greens',
  portion_grams: 350,
  est_calories: 640,
  est_protein_g: 32,
  est_carbs_g: 74,
  est_fat_g: 22,
  guessed_count: 0,
  items: [PHOTO_ITEM],
};

function pressTile(name: RegExp) {
  fireEvent.press(screen.getByRole('button', { name }));
}

describe('nutrition: LogMealSheet forwards a photo estimate to 21a (issues #24, #25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureMealPhotoFromCamera.mockResolvedValue({ status: 'ok', file: FAKE_FILE });
  });

  it('pushes to the 21a result screen (/diet/photo-result), not straight to Check My Math', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess(PHOTO_ESTIMATE),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Snap the plate/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    expect(pushedUrl).toContain('/diet/photo-result');
    expect(pushedUrl).not.toContain('/diet/confirm');
    expect(pushedUrl).toContain('source=photo');
  });

  it('includes items[] and guessed_count in the prefill JSON when the photo estimate has them', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess(PHOTO_ESTIMATE),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Snap the plate/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);

    const prefillParam = new URLSearchParams(pushedUrl.split('?')[1]).get('prefill');
    expect(prefillParam).not.toBeNull();
    const prefill = JSON.parse(prefillParam!);

    expect(prefill.items).toEqual([PHOTO_ITEM]);
    expect(prefill.guessed_count).toBe(0);
    // Aggregate fields still forwarded — no regression on the existing manual-edit funnel.
    expect(prefill.food_name).toBe('Rice bowl, paneer, greens');
    expect(prefill.calories).toBe(640);
    expect(prefill.protein_g).toBe(32);
    expect(prefill.carbs_g).toBe(74);
    expect(prefill.fat_g).toBe(22);
  });

  it('forwards the captured photo uri as a separate photoUri param (21a shows the real photo)', async () => {
    mockAnalyzePhotoMutate.mockImplementation((_file, handlers) =>
      handlers.onSuccess(PHOTO_ESTIMATE),
    );
    render(<LogMealSheet visible onClose={jest.fn()} />);

    pressTile(/^Snap the plate/);

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const pushedUrl = String(mockPush.mock.calls[0][0]);
    const photoUri = new URLSearchParams(pushedUrl.split('?')[1]).get('photoUri');
    expect(photoUri).toBe(FAKE_FILE.uri);
  });
});
