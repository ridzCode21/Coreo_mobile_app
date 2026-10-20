/**
 * Issue #48 — "A source went quiet screen" (design-spec.md 25b). Acceptance criteria: the screen
 * uses only values from `GET /integrations/sources/` (`apps/integrations/source_status.py:9-46`),
 * "Reconnect" opens the right permission/sign-in flow, and nothing mentions Whoop (the design's
 * literal example source — Whoop is Phase 2 per `docs/mvp.md` and the issue body).
 *
 * Scope decision (plan.md Decision log): the design's "Last night" Sleep/Recovery card is omitted.
 * The backend provides no "quiet" flag, no sleep-estimate marker, and no recovery value (issue
 * "Backend dependency" section), so rendering that card would either invent a label the API can't
 * support or require data this screen has no honest source for. This test locks that decision in as
 * a regression guard against re-adding invented copy.
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
let mockIsLoading = false;
let mockIsError = false;

jest.mock('@/features/home/api/sourcesApi', () => {
  const actual = jest.requireActual('@/features/home/api/sourcesApi');
  return {
    ...actual,
    useSourcesQuery: () => ({
      data: mockSources,
      isLoading: mockIsLoading,
      isError: mockIsError,
    }),
  };
});

const NOW = new Date('2026-06-09T13:00:00.000Z');
const STALE = new Date(NOW.getTime() - 30 * 3600 * 1000).toISOString(); // 2026-06-08T07:00:00Z

function source(overrides: Partial<SourceStatus> & Pick<SourceStatus, 'source'>): SourceStatus {
  return { connected: true, last_synced_at: null, synced_through: null, ...overrides };
}

describe('profile: SourceQuietScreen (issue #48)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    mockPush.mockClear();
    mockBack.mockClear();
    mockIsLoading = false;
    mockIsError = false;
    mockSources = undefined;
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a loading state, not a fabricated default', () => {
    mockIsLoading = true;
    render(<SourceQuietScreen />);
    expect(screen.queryByText(/stopped talking to me/i)).toBeNull();
  });

  it('shows an error state when the sources query fails', () => {
    mockIsError = true;
    render(<SourceQuietScreen />);
    expect(screen.getByText('Unable to load connected sources.')).toBeTruthy();
  });

  it('shows an honest empty state when no source is quiet', () => {
    mockSources = [
      source({ source: 'apple_health', last_synced_at: NOW.toISOString() }),
      source({ source: 'health_connect', connected: false, last_synced_at: null }),
      source({ source: 'strava', connected: true, last_synced_at: null }),
    ];
    render(<SourceQuietScreen />);
    expect(screen.queryByText(/stopped talking to me/i)).toBeNull();
    expect(screen.getByText('All sources are syncing normally.')).toBeTruthy();
  });

  describe('a quiet phone source', () => {
    beforeEach(() => {
      mockSources = [
        source({ source: 'apple_health', last_synced_at: NOW.toISOString() }),
        source({ source: 'health_connect', last_synced_at: STALE }),
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

    it('never shows the Sleep/Recovery/Estimate card (backend provides no estimate marker or recovery value)', () => {
      render(<SourceQuietScreen />);
      expect(screen.queryByText('Last night')).toBeNull();
      expect(screen.queryByText('Sleep')).toBeNull();
      expect(screen.queryByText('Recovery')).toBeNull();
      expect(screen.queryByText('Estimate')).toBeNull();
      expect(screen.queryByText('Unavailable today')).toBeNull();
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
});
