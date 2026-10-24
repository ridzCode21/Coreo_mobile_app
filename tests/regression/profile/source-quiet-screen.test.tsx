/**
 * Issue #48 — "A source went quiet screen" (design-spec.md 25b). Acceptance criteria: the screen
 * uses only values from `GET /integrations/sources/` (`apps/integrations/views.py:30-37`,
 * `apps/integrations/source_status.py:9-70`, `apps/integrations/readings.py:26-36`), "Reconnect"
 * opens the right permission/sign-in flow, and nothing mentions Whoop (the design's literal example
 * source — Whoop is Phase 2 per `docs/mvp.md` and the issue body).
 *
 * Round 2 (plan.md Decision log #1): the previously-PARTIAL "Last night" Sleep/Recovery card is now
 * built, since the backend issues that blocked it (`vipin4250/Self_dev#62`, `#63`) are closed and
 * `GET /integrations/sources/` now returns a `last_night` key alongside `sources`
 * (`apps/integrations/views.py:30-37`). It renders only when real data exists — never a fabricated
 * sleep number, estimate tag, or recovery score (plan.md Decision log #6).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import SourceQuietScreen from '@/features/profile/screens/SourceQuietScreen';
import type { SourceStatus } from '@/features/home/api/sourcesApi';
import { glass } from '@/shared/theme/tokens';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

let mockSources: SourceStatus[] | undefined;
let mockSourcesIsLoading = false;
let mockSourcesIsError = false;
let mockLastNight:
  | {
      date: string;
      sleep: { hours: number; estimate: boolean } | null;
      recovery: { score: number } | null;
    }
  | undefined;

jest.mock('@/features/home/api/sourcesApi', () => {
  const actual = jest.requireActual('@/features/home/api/sourcesApi');
  return {
    ...actual,
    useSourcesQuery: () => ({
      data: mockSources,
      isLoading: mockSourcesIsLoading,
      isError: mockSourcesIsError,
    }),
    useLastNightQuery: () => ({
      data: mockLastNight,
      isLoading: false,
      isError: false,
    }),
  };
});

const NOW = new Date('2026-06-09T13:00:00.000Z');
const STALE = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString(); // 2026-06-08T07:00:00Z

function source(overrides: Partial<SourceStatus> & Pick<SourceStatus, 'source'>): SourceStatus {
  return {
    connected: true,
    last_synced_at: null,
    synced_through: null,
    status: null,
    ...overrides,
  };
}

describe('profile: SourceQuietScreen (issue #48)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    mockPush.mockClear();
    mockBack.mockClear();
    mockSourcesIsLoading = false;
    mockSourcesIsError = false;
    mockSources = undefined;
    mockLastNight = undefined;
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a loading state, not a fabricated default', () => {
    mockSourcesIsLoading = true;
    render(<SourceQuietScreen />);
    expect(screen.queryByText(/stopped talking to me/i)).toBeNull();
  });

  it('shows an error state when the sources query fails', () => {
    mockSourcesIsError = true;
    render(<SourceQuietScreen />);
    expect(screen.getByText('Unable to load connected sources.')).toBeTruthy();
  });

  it('shows an honest empty state when no source is quiet', () => {
    mockSources = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'live' }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    render(<SourceQuietScreen />);
    expect(screen.queryByText(/stopped talking to me/i)).toBeNull();
    expect(screen.getByText('All sources are syncing normally.')).toBeTruthy();
  });

  describe('a quiet phone source (backend status "quiet")', () => {
    beforeEach(() => {
      mockSources = [
        source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'live' }),
        source({ source: 'health_connect', last_synced_at: STALE, status: 'quiet' }),
        source({ source: 'strava', connected: false, last_synced_at: null }),
      ];
    });

    it('renders the quiet source name and last-synced time dynamically, never "Whoop"', () => {
      render(<SourceQuietScreen />);
      expect(screen.getByText('Health Connect stopped talking to me.')).toBeTruthy();
      expect(screen.getByText(/Last synced yesterday, 7:00 AM\./)).toBeTruthy();
      expect(screen.queryByText(/whoop/i)).toBeNull();
    });

    it('uses the source-quiet material and readable body line height from the design', () => {
      render(<SourceQuietScreen />);

      expect(glass).toMatchObject({
        sourceQuietCard: {
          gradient: ['rgba(255,255,255,0.66)', 'rgba(255,255,255,0.26)'],
          border: 'rgba(255,255,255,0.6)',
          shadowColor: 'rgba(18,42,70,0.14)',
          topHighlight: 'rgba(255,255,255,0.7)',
        },
      });
      expect(
        StyleSheet.flatten(screen.getByText(/Last synced yesterday, 7:00 AM\./).props.style),
      ).toMatchObject({ lineHeight: 21.25 });
    });

    it('shows the connected-sources summary line and the Manage pill', () => {
      render(<SourceQuietScreen />);
      expect(screen.getByText('Connected')).toBeTruthy();
      expect(screen.getByText('Apple Health · active — Health Connect · quiet')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Manage' }));
      expect(mockPush).toHaveBeenCalledWith('/profile/manage-sources');
    });

    it('"Reconnect Health Connect" opens the phone permission settings screen, not an API call', () => {
      render(<SourceQuietScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Reconnect Health Connect' }));
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('"Remind me later" dismisses the screen without calling any API', () => {
      render(<SourceQuietScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Remind me later' }));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('omits the "Last night" card when last_night.sleep is null', () => {
      mockLastNight = { date: '2026-06-08', sleep: null, recovery: null };
      render(<SourceQuietScreen />);
      expect(screen.queryByText('Last night')).toBeNull();
      expect(screen.queryByText('Sleep')).toBeNull();
      expect(screen.queryByText('Recovery')).toBeNull();
    });

    it('shows the "Last night" card with the real sleep duration and an Estimate badge when estimate is true', () => {
      mockLastNight = {
        date: '2026-06-08',
        sleep: { hours: 6 + 40 / 60, estimate: true },
        recovery: null,
      };
      render(<SourceQuietScreen />);
      expect(screen.getByText('Last night')).toBeTruthy();
      expect(screen.getByText('Sleep')).toBeTruthy();
      expect(screen.getByText('6h 40m')).toBeTruthy();
      expect(screen.getByText('Estimate')).toBeTruthy();
      expect(screen.getByText('Recovery')).toBeTruthy();
      expect(screen.getByText('Unavailable today')).toBeTruthy();
    });

    it('shows the Sleep row without an Estimate badge when estimate is false', () => {
      mockLastNight = {
        date: '2026-06-08',
        sleep: { hours: 7, estimate: false },
        recovery: null,
      };
      render(<SourceQuietScreen />);
      expect(screen.getByText('7h 0m')).toBeTruthy();
      expect(screen.queryByText('Estimate')).toBeNull();
    });

    it('shows a real recovery score instead of "Unavailable today" when one exists', () => {
      mockLastNight = {
        date: '2026-06-08',
        sleep: { hours: 7, estimate: false },
        recovery: { score: 82 },
      };
      render(<SourceQuietScreen />);
      expect(screen.getByText('82')).toBeTruthy();
      expect(screen.queryByText('Unavailable today')).toBeNull();
    });
  });

  describe('a live phone source with status "estimate" is never treated as quiet', () => {
    it('does not show the quiet banner for an "estimate" status source that is actually live', () => {
      mockSources = [
        source({ source: 'apple_health', last_synced_at: NOW.toISOString(), status: 'estimate' }),
        source({ source: 'health_connect', connected: false, last_synced_at: null }),
        source({ source: 'strava', connected: false, last_synced_at: null }),
      ];
      render(<SourceQuietScreen />);
      expect(screen.queryByText(/stopped talking to me/i)).toBeNull();
      expect(screen.getByText('All sources are syncing normally.')).toBeTruthy();
    });
  });

  describe('a quiet-ineligible Strava row (no sync timestamp exists to go stale)', () => {
    it('never treats Strava as the quiet source, even though it is connected', () => {
      mockSources = [
        source({ source: 'apple_health', connected: false, last_synced_at: null }),
        source({ source: 'health_connect', connected: false, last_synced_at: null }),
        source({ source: 'strava', connected: true, last_synced_at: null }),
      ];
      render(<SourceQuietScreen />);
      expect(screen.getByText('All sources are syncing normally.')).toBeTruthy();
      expect(screen.queryByText(/strava stopped talking to me/i)).toBeNull();
    });
  });

  describe('a quiet Strava row via the client-side 24h heuristic', () => {
    it('treats Strava as quiet once its real last_synced_at is 24h+ stale', () => {
      mockSources = [
        source({ source: 'apple_health', connected: false, last_synced_at: null }),
        source({ source: 'health_connect', connected: false, last_synced_at: null }),
        source({ source: 'strava', connected: true, last_synced_at: STALE }),
      ];
      render(<SourceQuietScreen />);
      expect(screen.getByText('Strava stopped talking to me.')).toBeTruthy();
    });
  });
});
