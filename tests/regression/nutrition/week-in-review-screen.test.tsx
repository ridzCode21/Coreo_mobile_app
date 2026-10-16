/**
 * Issue #29 — Week in review screen (15c, design-spec.md lines 1519-1586). Covers: every exact
 * copy string the design requires, the subtitle/target-changes empty cases that must never
 * fabricate data, the 404 `no_review` calm empty state vs. any other error, back/refresh, and "no
 * red anywhere". Data shape mirrors `review_payload()` (weekly_review.py:131-147).
 */

import { RefreshControl, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

import WeekInReviewScreen from '@/features/nutrition/screens/WeekInReviewScreen';
import type { WeeklyDietReview } from '@/shared/types/weeklyDietReview';
import { ApiError } from '@/shared/api/errors';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

let mockData: WeeklyDietReview | undefined;
let mockIsLoading = false;
let mockIsError = false;
let mockError: unknown;
const mockRefetch = jest.fn();
jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  useWeeklyDietReviewQuery: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    isRefetching: false,
    refetch: mockRefetch,
  }),
}));

const FULL_REVIEW: WeeklyDietReview = {
  week_start: '2026-09-28',
  week_end: '2026-10-04',
  generated_at: '2026-10-04T18:00:00+00:00',
  days_on_target: 5,
  headline: "It's working.",
  subtitle: 'Protein up, weight following.',
  adherence_line: 'Five of seven on target.',
  pattern_callout: "Fridays and Saturdays run late and heavy, that's a pattern, not a failure.",
  recommendation: {
    title: 'Move Friday dinner earlier',
    detail: 'Late Friday dinners cost you Saturday too. Move it an hour. That fixes both days.',
  },
  days: [
    {
      date: '2026-09-28',
      weekday: 'Monday',
      calories_in: 2000,
      protein_g: 100,
      weight_kg: 79,
      target_calories: 2000,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-09-29',
      weekday: 'Tuesday',
      calories_in: 1900,
      protein_g: 95,
      weight_kg: null,
      target_calories: 2000,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-09-30',
      weekday: 'Wednesday',
      calories_in: 1800,
      protein_g: 90,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: false,
    },
    {
      date: '2026-10-01',
      weekday: 'Thursday',
      calories_in: 1960,
      protein_g: 100,
      weight_kg: null,
      target_calories: 1960,
      on_target: true,
      late_dinner: false,
    },
    {
      date: '2026-10-02',
      weekday: 'Friday',
      calories_in: 2500,
      protein_g: 100,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: true,
    },
    {
      date: '2026-10-03',
      weekday: 'Saturday',
      calories_in: 2400,
      protein_g: 90,
      weight_kg: null,
      target_calories: 1960,
      on_target: false,
      late_dinner: true,
    },
    {
      date: '2026-10-04',
      weekday: 'Sunday',
      calories_in: 2000,
      protein_g: 100,
      weight_kg: 79,
      target_calories: 1960,
      on_target: false,
      late_dinner: false,
    },
  ],
  target_changes: [
    {
      previous_calories: 2000,
      new_calories: 1960,
      changed_at: '2026-09-30T09:00:00+00:00',
      source: 'calculated',
      note: 'Targets were recalculated from your profile.',
    },
  ],
};

function collectBackgroundColors(tree: ReturnType<typeof render>): string[] {
  const colors: string[] = [];
  const json = tree.toJSON();
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    const style = n.props?.style;
    const flattened = style ? StyleSheet.flatten(style as never) : undefined;
    if (flattened && typeof flattened === 'object') {
      for (const key of ['backgroundColor', 'color', 'shadowColor', 'borderColor']) {
        const value = (flattened as Record<string, unknown>)[key];
        if (typeof value === 'string') colors.push(value);
      }
    }
    n.children?.forEach(walk);
  };
  if (Array.isArray(json)) json.forEach(walk);
  else walk(json);
  return colors;
}

describe('nutrition: WeekInReviewScreen (issue #29, design 15c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockData = FULL_REVIEW;
    mockIsLoading = false;
    mockIsError = false;
    mockError = undefined;
  });

  it('keeps the header and back action available while the review loads', () => {
    mockData = undefined;
    mockIsLoading = true;
    render(<WeekInReviewScreen />);
    expect(screen.getByLabelText('Loading your week in review')).toBeTruthy();
    expect(screen.getByText('Week in review')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("It's working.")).toBeNull();
  });

  it('renders the eyebrow, date chip, headline and subtitle exactly', () => {
    render(<WeekInReviewScreen />);
    expect(screen.getByText('Week in review')).toBeTruthy();
    expect(screen.getByText('Sep 28 – Oct 4')).toBeTruthy();
    expect(screen.getByText("It's working.")).toBeTruthy();
    expect(screen.getByText('Protein up, weight following.')).toBeTruthy();
  });

  it('omits the subtitle node (no stray space) when subtitle is empty', () => {
    mockData = { ...FULL_REVIEW, subtitle: '' };
    render(<WeekInReviewScreen />);
    expect(screen.getByText("It's working.")).toBeTruthy();
    expect(screen.queryByText('Protein up, weight following.')).toBeNull();
  });

  it('renders the days-near-target card with the exact combined sentence', () => {
    render(<WeekInReviewScreen />);
    expect(screen.getByText('Days near target')).toBeTruthy();
    expect(screen.getByText('Mon to Sun')).toBeTruthy();
    expect(
      screen.getByText(
        "Five of seven on target. Fridays and Saturdays run late and heavy, that's a pattern, not a failure.",
      ),
    ).toBeTruthy();
  });

  it('uses bright bars for on-target days and dim bars otherwise', () => {
    render(<WeekInReviewScreen />);
    const onTargetStyle = StyleSheet.flatten(
      screen.getByTestId('week-review-bar-Monday').props.style,
    );
    const offTargetStyle = StyleSheet.flatten(
      screen.getByTestId('week-review-bar-Wednesday').props.style,
    );

    expect(onTargetStyle.backgroundColor).not.toBe(offTargetStyle.backgroundColor);
    expect(onTargetStyle.shadowOpacity).toBe(1);
    expect(offTargetStyle.shadowOpacity).toBeUndefined();
  });

  it("renders This week's call with the recommendation title and detail", () => {
    render(<WeekInReviewScreen />);
    expect(screen.getByText("This week's call")).toBeTruthy();
    expect(screen.getByText('Move Friday dinner earlier')).toBeTruthy();
    expect(
      screen.getByText(
        'Late Friday dinners cost you Saturday too. Move it an hour. That fixes both days.',
      ),
    ).toBeTruthy();
  });

  it('renders Target updated with the formatted value, the "was" clause and the note', () => {
    render(<WeekInReviewScreen />);
    expect(screen.getByText('Target updated')).toBeTruthy();
    expect(screen.getByText('1,960')).toBeTruthy();
    expect(screen.getByText('kcal / day · was 2,000')).toBeTruthy();
    expect(screen.getByText('Targets were recalculated from your profile.')).toBeTruthy();
  });

  it('omits the "was" clause when previous_calories is null (no invented number)', () => {
    mockData = {
      ...FULL_REVIEW,
      target_changes: [{ ...FULL_REVIEW.target_changes[0], previous_calories: null }],
    };
    render(<WeekInReviewScreen />);
    expect(screen.getByText('kcal / day')).toBeTruthy();
    expect(screen.queryByText(/· was/)).toBeNull();
  });

  it('hides the Target updated card entirely when target_changes is empty', () => {
    mockData = { ...FULL_REVIEW, target_changes: [] };
    render(<WeekInReviewScreen />);
    expect(screen.queryByText('Target updated')).toBeNull();
  });

  it('always renders the static footer line', () => {
    render(<WeekInReviewScreen />);
    expect(
      screen.getByText(
        'This lands Sunday evening. No streaks, no badges, just whether it&apos;s working and one thing to try.'.replace(
          '&apos;',
          "'",
        ),
      ),
    ).toBeTruthy();
  });

  it('shows the calm empty state on a 404 no_review, with no cards or bars', () => {
    mockData = undefined;
    mockIsError = true;
    mockError = new ApiError('not found', 'unknown', 404, { error: 'no_review' });
    render(<WeekInReviewScreen />);
    expect(screen.queryByText("It's working.")).toBeNull();
    expect(screen.queryByText('Days near target')).toBeNull();
    expect(screen.queryByText("This week's call")).toBeNull();
    expect(screen.getByText(/No review yet/i)).toBeTruthy();
  });

  it('shows a different calm note for a non-404 error', () => {
    mockData = undefined;
    mockIsError = true;
    mockError = new ApiError('server error', 'server', 500, undefined);
    render(<WeekInReviewScreen />);
    const emptyCopy = screen.queryByText(/No review yet/i);
    expect(emptyCopy).toBeNull();
    expect(screen.getByText(/couldn.t load|pull to refresh/i)).toBeTruthy();
  });

  it('the back button calls router.back()', () => {
    render(<WeekInReviewScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('pull-to-refresh refetches the query', () => {
    render(<WeekInReviewScreen />);
    const refreshControl = screen.UNSAFE_getByType(RefreshControl);
    refreshControl.props.onRefresh();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('never uses a red color anywhere on the screen', () => {
    const tree = render(<WeekInReviewScreen />);
    const colors = collectBackgroundColors(tree);
    for (const color of colors) {
      expect(color.toLowerCase()).not.toMatch(/^#f[0-9a-f]?0{2,3}\b|red/);
    }
  });
});
