/**
 * Issue #50 — Patterns screens (design-spec.md 37a/37b). Acceptance criteria: 37a shows the real
 * day count from `GET /insights/`'s `not_enough_data` status, 37b shows only the API's own
 * `insight_text`/`disclaimer` text plus a disclaimer, and neither screen ever invents a number
 * (the design's sample "1,800 fewer steps" / "under 6 hours" / "last 6 weeks" are never rendered).
 *
 * Scope decision (plan.md Decision log #5): `no_insights` has no design frame, so it renders a
 * minimal fallback (eyebrow + the backend's own `message`, no card) instead of a fabricated one —
 * this test locks that decision in as a regression guard, flagged PARTIAL in blocked.txt.
 *
 * Scope decision (plan.md Decision log #3): the design's per-card sub-line ("Based on the last 6
 * weeks...") contains an invented time window, so the real screen renders the API's own
 * `disclaimer` field in that slot instead.
 */

import { render, screen } from '@testing-library/react-native';

import PatternsScreen from '@/features/patterns/screens/PatternsScreen';
import type { Insight } from '@/features/patterns/api/insightsApi';
import { glass } from '@/shared/theme/tokens';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

let mockData: unknown;
let mockIsLoading = false;
let mockIsError = false;

jest.mock('@/features/patterns/api/insightsApi', () => {
  const actual = jest.requireActual('@/features/patterns/api/insightsApi');
  return {
    ...actual,
    useInsightsQuery: () => ({
      data: mockData,
      isLoading: mockIsLoading,
      isError: mockIsError,
    }),
  };
});

const DISCLAIMER =
  'Health patterns only. Not medical advice. Consult a healthcare provider for medical decisions.';

function card(overrides: Partial<Insight> & Pick<Insight, 'id' | 'insight_text'>): Insight {
  return {
    col_x: 'sleep_hours',
    col_y: 'steps',
    r_value: -0.4,
    lag_days: 1,
    autocorrelation_warning: false,
    created_at: '2026-06-01T00:00:00Z',
    disclaimer: DISCLAIMER,
    ...overrides,
  };
}

describe('patterns: PatternsScreen (issue #50)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockIsLoading = false;
    mockIsError = false;
    mockData = undefined;
  });

  it('shows a loading state, not a fabricated default', () => {
    mockIsLoading = true;
    render(<PatternsScreen />);
    expect(screen.queryByText(/of 30 days/)).toBeNull();
    expect(screen.queryByText('A pattern worth watching')).toBeNull();
  });

  it('shows an error state when the insights query fails', () => {
    mockIsError = true;
    render(<PatternsScreen />);
    expect(screen.getByText('Unable to load your patterns.')).toBeTruthy();
  });

  describe('not_enough_data (37a)', () => {
    beforeEach(() => {
      mockData = { status: 'not_enough_data', days_logged: 22, days_remaining: 8 };
    });

    it('shows the real day count, not a hardcoded one', () => {
      render(<PatternsScreen />);
      expect(screen.getByText('22 of 30 days')).toBeTruthy();
    });

    it('shows the exact calibrating copy verbatim', () => {
      render(<PatternsScreen />);
      expect(screen.getByText('Calibrating')).toBeTruthy();
      expect(screen.getByText('Real soon')).toBeTruthy();
      expect(
        screen.getByText(
          "Patterns take time to see clearly. Once you've logged consistently for about a month, I'll start pointing out what seems connected.",
        ),
      ).toBeTruthy();
      expect(
        screen.getByText('Not medical advice — just what I notice in your own numbers.'),
      ).toBeTruthy();
    });

    it('recomputes the day count for a different value (never hardcoded)', () => {
      mockData = { status: 'not_enough_data', days_logged: 3, days_remaining: 27 };
      render(<PatternsScreen />);
      expect(screen.getByText('3 of 30 days')).toBeTruthy();
      expect(screen.queryByText('22 of 30 days')).toBeNull();
    });

    it('uses the exact patternsCalibratingCard glass material from the design', () => {
      render(<PatternsScreen />);
      expect(glass.patternsCalibratingCard).toMatchObject({
        gradient: ['rgba(60,72,86,0.5)', 'rgba(30,40,50,0.58)'],
      });
    });
  });

  describe('no_insights (no design — minimal fallback, PARTIAL)', () => {
    it('shows the backend message with no fabricated card', () => {
      mockData = { status: 'no_insights', message: 'Keep logging...' };
      render(<PatternsScreen />);
      expect(screen.getByText('Keep logging...')).toBeTruthy();
      expect(screen.queryByText('Calibrating')).toBeNull();
      expect(screen.queryByText('A pattern worth watching')).toBeNull();
    });
  });

  describe('ready with one insight (37b)', () => {
    beforeEach(() => {
      mockData = {
        status: 'ready',
        insights: [
          card({
            id: 1,
            col_x: 'sleep_hours',
            col_y: 'steps',
            insight_text: 'Less sleep seems linked to fewer steps the next day.',
          }),
        ],
      };
    });

    it('maps col_x/col_y to chip labels, never the raw machine column name', () => {
      render(<PatternsScreen />);
      expect(screen.getByText('Sleep')).toBeTruthy();
      expect(screen.getByText('Steps')).toBeTruthy();
      expect(screen.queryByText('sleep_hours')).toBeNull();
    });

    it('renders the API insight_text verbatim, never the design sample sentence', () => {
      render(<PatternsScreen />);
      expect(screen.getByText('Less sleep seems linked to fewer steps the next day.')).toBeTruthy();
      expect(screen.queryByText(/1,800/)).toBeNull();
      expect(screen.queryByText(/under 6 hours/)).toBeNull();
    });

    it('renders the API disclaimer verbatim in place of the invented "last 6 weeks" line', () => {
      render(<PatternsScreen />);
      expect(screen.getByText(DISCLAIMER)).toBeTruthy();
      expect(screen.queryByText(/last 6 weeks/)).toBeNull();
      expect(screen.queryByText(/May be worth watching, not a rule\./)).toBeNull();
    });

    it('shows the exact screen heading and footer copy', () => {
      render(<PatternsScreen />);
      expect(screen.getByText('A pattern worth watching')).toBeTruthy();
      expect(
        screen.getByText('Not medical advice — just a pattern I noticed in your own data.'),
      ).toBeTruthy();
    });

    it('uses the exact patternsInsightCard glass material from the design', () => {
      render(<PatternsScreen />);
      expect(glass.patternsInsightCard).toMatchObject({
        gradient: ['rgba(34,66,102,0.85)', 'rgba(12,28,48,0.9)'],
      });
    });
  });

  describe('ready with multiple insights', () => {
    it('renders one chip row + card per insight, dropping none', () => {
      mockData = {
        status: 'ready',
        insights: [
          card({
            id: 1,
            col_x: 'sleep_hours',
            col_y: 'steps',
            insight_text: 'Less sleep seems linked to fewer steps the next day.',
          }),
          card({
            id: 2,
            col_x: 'protein_g',
            col_y: 'weight_kg',
            insight_text: 'Higher protein days line up with a steadier weight trend.',
          }),
        ],
      };
      render(<PatternsScreen />);

      expect(screen.getByText('Less sleep seems linked to fewer steps the next day.')).toBeTruthy();
      expect(
        screen.getByText('Higher protein days line up with a steadier weight trend.'),
      ).toBeTruthy();
      expect(screen.getByText('Protein')).toBeTruthy();
      expect(screen.getByText('Weight')).toBeTruthy();
    });
  });

  it('the back control calls router.back()', () => {
    mockData = { status: 'not_enough_data', days_logged: 1, days_remaining: 29 };
    render(<PatternsScreen />);
    const { fireEvent } = jest.requireActual('@testing-library/react-native');
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
