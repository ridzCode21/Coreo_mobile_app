/**
 * Issue #19 — days 1-3 after onboarding (`wave: 'dashed'` from `GET /users/profile/`) replace the
 * normal home (issue #17) with the calibrating layout (design 10b, lines 686-771): "Welcome in,
 * {name}.", the fixed subtitle, a "Calibrating" card with a fully dashed wave and "Day {n} / Real by
 * day 4", the "Reading you" card, "While I read, go meet your pillars.", and petals with sub-labels.
 * From day 4 (`wave: 'solid'`) the normal issue-#17/#18 home must appear — this is the regression
 * half of the test, locking in that the calibrating branch cannot leak into the solid-wave home.
 *
 * Issue #136 — `core_index` is `null` while calibration is incomplete anyway
 * (`apps/users/services/core_index.py:24-25`), and this branch renders `CalibratingWaveCard`
 * instead of `TodayScoreCard` regardless, so the score digits must never appear here even if the
 * daily-summary mock were given a number.
 */

import { render, screen } from '@testing-library/react-native';

import CoreoHomeScreen from '@/features/home/screens/CoreoHomeScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { DailySummary } from '@/shared/types/dailyLog';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

type MockProfile = {
  first_name: string;
  calibration_day?: number | null;
  calibration_complete?: boolean;
  wave?: 'dashed' | 'solid' | null;
};

let mockProfileData: MockProfile | undefined;
let mockProfileLoading = false;
jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({ data: mockProfileData, isLoading: mockProfileLoading }),
}));

let mockDietProfile: Partial<DietProfile> | undefined;
jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({ data: mockDietProfile, isLoading: false }),
  targetQuality: () => 'unavailable',
}));

let mockSummary: Partial<DailySummary> | undefined;
jest.mock('@/features/nutrition', () => ({
  todayISO: () => '2026-07-06',
  useDailySummaryQuery: () => ({ data: mockSummary, isLoading: false }),
  useRejectedMeals: () => ({ count: 0, dismiss: jest.fn() }),
  targetsFromProfile: () => ({ calories: 2000, protein: 150, carbs: 200, fat: 60 }),
}));

let mockSources: SourceStatus[] | undefined;
jest.mock('@/features/home/api/sourcesApi', () => ({
  useSourcesQuery: () => ({ data: mockSources, isLoading: false }),
}));

jest.mock('@/features/home/api/nudgeApi', () => ({
  useNudgeQuery: () => ({ data: { nudge: null, message: null }, isLoading: false }),
}));

describe('home: CoreoHomeScreen calibrating state (issue #19)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 6, 8, 0));
    mockProfileData = { first_name: 'Asha' };
    mockProfileLoading = false;
    mockDietProfile = { daily_calories: 2000 } as Partial<DietProfile>;
    mockSummary = undefined;
    mockSources = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('days 1-3 (wave: dashed)', () => {
    beforeEach(() => {
      mockProfileData = {
        first_name: 'Asha',
        calibration_day: 1,
        calibration_complete: false,
        wave: 'dashed',
      };
    });

    it('shows "Welcome in, {name}." instead of the normal time-of-day greeting', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByText(/Welcome in,/)).toBeTruthy();
      expect(screen.getByText(/Asha\./)).toBeTruthy();
      expect(screen.queryByText(/Morning,/)).toBeNull();
    });

    it('shows the fixed subtitle "Still reading you. The wave stays dashed until day 4."', () => {
      render(<CoreoHomeScreen />);
      expect(
        screen.getByText('Still reading you. The wave stays dashed until day 4.'),
      ).toBeTruthy();
    });

    it('shows the Calibrating card with "Day {calibration_day}" and "Real by day 4"', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByText('Calibrating')).toBeTruthy();
      expect(screen.getByText('Day 1')).toBeTruthy();
      expect(screen.getByText('Real by day 4')).toBeTruthy();
    });

    it('on day 3 shows "Day 3"', () => {
      mockProfileData = {
        first_name: 'Asha',
        calibration_day: 3,
        calibration_complete: false,
        wave: 'dashed',
      };
      render(<CoreoHomeScreen />);
      expect(screen.getByText('Day 3')).toBeTruthy();
    });

    it('shows "While I read, go meet your pillars." and petal sub-labels', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByText('While I read, go meet your pillars.')).toBeTruthy();
      expect(screen.getAllByText('30 sec to set up')).toHaveLength(3);
      expect(screen.getByText('Ready')).toBeTruthy();
    });

    it('shows a connected source from GET /integrations/sources/ with no invented count', () => {
      mockSources = [
        {
          source: 'apple_health',
          connected: true,
          last_synced_at: '2026-07-06T07:00:00Z',
          synced_through: null,
        },
        { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
        { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
      ];
      render(<CoreoHomeScreen />);
      expect(screen.getByText('Apple Health — live, syncing now')).toBeTruthy();
      expect(screen.queryByText(/\d+ nights/)).toBeNull();
    });

    it('does not show the existing "Today" nutrition/movement/hydration card', () => {
      render(<CoreoHomeScreen />);
      expect(screen.queryByText('Today')).toBeNull();
      expect(screen.queryByText('Nutrition')).toBeNull();
    });

    it('never shows the Core Index score digits while calibrating, even if the backend returned a value', () => {
      mockSummary = { core_index: 42 } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByTestId('home-today-score')).toBeNull();
    });
  });

  describe('day 4+ (wave: solid) — normal issue #17/#18 home', () => {
    beforeEach(() => {
      mockProfileData = {
        first_name: 'Asha',
        calibration_day: 4,
        calibration_complete: true,
        wave: 'solid',
      };
    });

    it('shows the normal time-of-day greeting, not the calibrating copy', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByText(/Morning,/)).toBeTruthy();
      expect(screen.queryByText(/Welcome in,/)).toBeNull();
      expect(screen.queryByText('Calibrating')).toBeNull();
      expect(screen.queryByText(/Day \d/)).toBeNull();
      expect(screen.queryByText('While I read, go meet your pillars.')).toBeNull();
    });

    it('shows both the issue #18 hero and the existing nutrition "Today" card', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getAllByText('Today')).toHaveLength(2);
      expect(screen.getByText('Nutrition')).toBeTruthy();
    });
  });

  describe('profile still loading / wave not present — regression guard for issue #17', () => {
    it('falls back to the existing normal home exactly as before (no crash, no calibrating copy)', () => {
      mockProfileData = { first_name: 'Asha' };
      render(<CoreoHomeScreen />);
      expect(screen.getByText(/Morning,/)).toBeTruthy();
      expect(screen.queryByText(/Welcome in,/)).toBeNull();
      expect(screen.queryByText('Calibrating')).toBeNull();
    });
  });
});
