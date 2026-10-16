/**
 * Issue #26, design 25d "Couldn't read the label" (design-spec.md lines 174-251). Reached from
 * `LogMealSheet` on a 422 from `POST /food/label-ocr/` (see log-meal-sheet.test.tsx) with the API's
 * own title/message carried as route params. Nothing is logged by this screen — it only offers the
 * three recovery actions the issue calls out: describe it, scan a barcode, or try another photo.
 * Per Decision log in plan.md: "Describe it" opens the manual-entry confirm screen (the closest
 * existing "type the product" surface — there is no standalone search screen), "Scan barcode
 * instead" opens the existing barcode scanner (`/diet/scan`), and "Try another photo" returns to
 * Diet home where the user reopens the logging sheet (there is no route-addressable way to
 * re-trigger the camera from a route outside the sheet).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import LabelUnreadableScreen from '@/app/(app)/(tabs)/diet/label-unreadable';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams(),
}));

let paramsOverride: Record<string, string | undefined> = {};
function mockParams() {
  return paramsOverride;
}

describe('nutrition: LabelUnreadableScreen (issue #26, design 25d)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paramsOverride = {
      title: "I couldn't read that label.",
      message: "Too blurry, maybe. Describe it and I've got you.",
    };
  });

  it("renders the API's own title and message", () => {
    render(<LabelUnreadableScreen />);
    expect(screen.getByText("I couldn't read that label.")).toBeTruthy();
    expect(screen.getByText("Too blurry, maybe. Describe it and I've got you.")).toBeTruthy();
  });

  it('falls back to the design copy when no title/message param is given (e.g. a direct link)', () => {
    paramsOverride = {};
    render(<LabelUnreadableScreen />);
    expect(screen.getByText("I couldn't read that label.")).toBeTruthy();
    expect(screen.getByText("Too blurry, maybe. Describe it and I've got you.")).toBeTruthy();
  });

  it('renders the eyebrow, the three recovery actions and the reassurance line', () => {
    render(<LabelUnreadableScreen />);
    expect(screen.getByText('Label · Snack')).toBeTruthy();
    expect(screen.getByText('Describe it')).toBeTruthy();
    expect(screen.getByText("Name the product, I'll look it up")).toBeTruthy();
    expect(screen.getByText('Scan barcode instead')).toBeTruthy();
    expect(screen.getByText('Most packaged foods have one')).toBeTruthy();
    expect(screen.getByText('Try another photo')).toBeTruthy();
    expect(screen.getByText('Nothing was logged yet.')).toBeTruthy();
  });

  it('"Describe it" opens manual entry — nothing was created by this screen', () => {
    render(<LabelUnreadableScreen />);
    fireEvent.press(screen.getByRole('button', { name: /^Describe it/ }));
    expect(mockPush).toHaveBeenCalledWith('/diet/confirm?source=manual');
  });

  it('"Scan barcode instead" opens the barcode scanner', () => {
    render(<LabelUnreadableScreen />);
    fireEvent.press(screen.getByRole('button', { name: /^Scan barcode instead/ }));
    expect(mockPush).toHaveBeenCalledWith('/diet/scan');
  });

  it('"Try another photo" goes back without creating anything', () => {
    render(<LabelUnreadableScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Try another photo' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
