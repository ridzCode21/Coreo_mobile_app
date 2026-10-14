/**
 * Issue #17 — `CoreoHomeScreen` must show the design's header/greeting/date and pillar petals
 * (design-spec.md 24b/10a), and stop showing the blocks the design doesn't have. Pre-fix: no date,
 * a centred uppercase "Coreo" label instead of the header row, no name (issue current-behavior,
 * `CoreoHomeScreen.tsx:91`, `:283-288`), and three extra cards not in the design — "Personalize
 * your diet" (`:132-147`, already duplicated properly on the Diet tab by
 * `DietPersonalizationCard`), the "+ Log meal"/"+ Add workout" pills (`:149-166`, "+ Log meal"
 * duplicates the Diet tab's own "Log a meal" pill; "+ Add workout" only ever pointed at the
 * Fitness placeholder tab), and the "Signals" card (`:168-207`). Decision: all three are removed
 * from Home rather than kept (see plan.md Decision log); this test locks that in. The existing
 * "Today" nutrition/movement/hydration card is untouched — the issue doesn't call it out as extra,
 * so it's out of this issue's diff.
 */

import { render, screen } from '@testing-library/react-native';

import CoreoHomeScreen from '@/features/home/screens/CoreoHomeScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { DailySummary } from '@/shared/types/dailyLog';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

let mockProfileData: { first_name: string } | undefined;
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
  targetsFromProfile: () => ({ calories: 2000, protein: 150, carbs: 200, fat: 60 }),
}));

describe('home: CoreoHomeScreen (issue #17)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 6, 8, 0)); // Mon Jul 6, 08:00 → Morning
    mockProfileData = { first_name: 'Asha' };
    mockProfileLoading = false;
    mockDietProfile = { daily_calories: 2000 } as Partial<DietProfile>;
    mockSummary = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the header row: lowercase "coreo" wordmark and today\'s date, not the old centred "Coreo" eyebrow', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getByText('coreo')).toBeTruthy();
    expect(screen.getByText('Mon · Jul 6')).toBeTruthy();
    expect(screen.queryByText('Coreo')).toBeNull();
  });

  it('greets the signed-in user by first name', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getByText(/Morning,/)).toBeTruthy();
    expect(screen.getByText(/Asha\./)).toBeTruthy();
  });

  it('never invents a name: shows the time-of-day greeting without a name while the profile is still loading', () => {
    mockProfileData = undefined;
    mockProfileLoading = true;
    render(<CoreoHomeScreen />);
    expect(screen.getByText(/Morning,/)).toBeTruthy();
    expect(screen.queryByText(/Asha/)).toBeNull();
  });

  it('shows the four pillar petals in design order with labels only', () => {
    render(<CoreoHomeScreen />);
    const buttons = screen.getAllByRole('button');
    const petalLabels = buttons
      .map((b) => b.props.accessibilityLabel as string)
      .filter((label) => ['Wellness', 'Fitness', 'Diet', 'Core'].includes(label));
    expect(petalLabels).toEqual(['Wellness', 'Fitness', 'Diet']);
    expect(screen.getByText('Core')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Core' })).toBeNull();
  });

  it('no longer shows the "Personalize your diet" card (already on the Diet tab via DietPersonalizationCard)', () => {
    mockDietProfile = { daily_calories: 2000, diet_type: null } as Partial<DietProfile>;
    render(<CoreoHomeScreen />);
    expect(screen.queryByText('Personalize your diet')).toBeNull();
    expect(screen.queryByText(/3 quick things/)).toBeNull();
  });

  it('no longer shows the "+ Log meal" / "+ Add workout" quick-action pills', () => {
    render(<CoreoHomeScreen />);
    expect(screen.queryByRole('button', { name: 'Log a meal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add workout' })).toBeNull();
  });

  it('no longer shows the "Signals" card or its empty-state copy', () => {
    render(<CoreoHomeScreen />);
    expect(screen.queryByText('Signals')).toBeNull();
    expect(screen.queryByText('No health signals yet.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add water' })).toBeNull();
  });

  it('still shows the existing "Today" nutrition/movement/hydration card (not part of this issue)', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Nutrition')).toBeTruthy();
    expect(screen.getByText('Movement')).toBeTruthy();
    expect(screen.getByText('Hydration')).toBeTruthy();
  });
});
