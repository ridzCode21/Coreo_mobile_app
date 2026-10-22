/**
 * Issue #44 — Profile screen (design-spec.md 19a). Acceptance criteria: "The screen shows real
 * profile data only" and "Connected sources come from the sources endpoint". This test renders
 * `ProfileScreen` with every hook mocked at the feature-index boundary (same pattern as
 * `tests/regression/home/core-home-screen.test.tsx`) so it never touches the network or the mock
 * API layer, and checks copy/structure/visibility rules rather than implementation details.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Path } from 'react-native-svg';

import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { FitnessProfile } from '@/shared/types/fitnessProfile';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: jest.fn() }),
}));

type MockProfileUser = {
  first_name: string;
  created_at: string;
  calibration_day: number | null;
  calibration_complete: boolean;
  wave: 'dashed' | 'solid' | null;
};

let mockUser: MockProfileUser | undefined;
let mockActivePillars: ('diet' | 'fitness' | 'wellness')[];

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({ data: mockUser, isLoading: !mockUser }),
  usePillarSelectionStore: (selector?: (state: { activePillars: unknown }) => unknown) => {
    const state = { activePillars: mockActivePillars };
    return selector ? selector(state) : state;
  },
}));

let mockDietProfile: Partial<DietProfile> | undefined;
jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({ data: mockDietProfile, isLoading: !mockDietProfile }),
}));

let mockFitnessProfile: Partial<FitnessProfile> | undefined;
jest.mock('@/features/fitness', () => ({
  useFitnessProfileQuery: () => ({ data: mockFitnessProfile, isLoading: !mockFitnessProfile }),
}));

let mockWellnessProfile: Partial<WellnessProfile> | undefined;
jest.mock('@/features/wellness', () => ({
  useWellnessProfileQuery: () => ({ data: mockWellnessProfile, isLoading: !mockWellnessProfile }),
}));

let mockSources: SourceStatus[] | undefined;
jest.mock('@/features/home/api/sourcesApi', () => {
  const actual = jest.requireActual('@/features/home/api/sourcesApi');
  return {
    ...actual,
    useSourcesQuery: () => ({ data: mockSources, isLoading: !mockSources }),
  };
});

jest.mock('@/features/profile/components/AccountActionsSection', () => ({
  AccountActionsSection: () => null,
}));

describe('profile: ProfileScreen (issue #44, design-spec.md 19a)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T00:00:00Z'));
    mockPush.mockClear();
    mockUser = {
      first_name: 'Shubham',
      created_at: '2026-03-02T00:00:00Z',
      calibration_day: null,
      calibration_complete: true,
      wave: 'solid',
    };
    mockActivePillars = ['diet', 'fitness', 'wellness'];
    mockDietProfile = {
      weight_kg: 78,
      target_weight_kg: 72,
      diet_type: 'vegetarian',
      daily_calories: 1960,
    };
    mockFitnessProfile = {
      fitness_goal: 'build_muscle',
      training_places: ['home_dumbbells_band'],
      sports: ['cricket'],
    };
    mockWellnessProfile = {
      wellness_focus: 'racing_mind',
      hide_numbers: true,
      check_in_style: 'step_in',
    };
    mockSources = [
      { source: 'apple_health', connected: true, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: true, last_synced_at: null, synced_through: null },
    ];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the real name, avatar initial and membership line, never a placeholder', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Shubham')).toBeTruthy();
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('With Coreo since March · Week 6')).toBeTruthy();
  });

  it('shows the goal card only when weight data supports it', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('The goal')).toBeTruthy();
    expect(screen.getByText('78 → 72 kg')).toBeTruthy();
  });

  it('hides the goal card entirely when the weight data is incomplete (never an invented trajectory)', () => {
    mockDietProfile = { ...mockDietProfile, weight_kg: null };
    render(<ProfileScreen />);
    expect(screen.queryByText('The goal')).toBeNull();
  });

  it('shows Diet, Fitness and Wellness rows composed from real profile fields', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Vegetarian · 1,960 kcal')).toBeTruthy();
    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText('Build muscle · home dumbbells · cricket')).toBeTruthy();
    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('Racing mind · no numbers')).toBeTruthy();
  });

  it('hides a pillar row the user never selected', () => {
    mockActivePillars = ['diet'];
    render(<ProfileScreen />);
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.queryByText('Fitness')).toBeNull();
    expect(screen.queryByText('Wellness')).toBeNull();
  });

  it('shows the check-ins card with its two static pills plus the data-bound style pill when wellness is active', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Check-ins')).toBeTruthy();
    expect(screen.getByText('Steps in early')).toBeTruthy();
    expect(screen.getByText('Plain words, no scores')).toBeTruthy();
    expect(screen.getByText('Never red, never guilt')).toBeTruthy();
  });

  it('hides the whole check-ins card when wellness is not active', () => {
    mockActivePillars = ['diet', 'fitness'];
    render(<ProfileScreen />);
    expect(screen.queryByText('Check-ins')).toBeNull();
    expect(screen.queryByText('Plain words, no scores')).toBeNull();
  });

  it('hides the check-ins card when wellness is active but the interview never set a check-in style', () => {
    mockWellnessProfile = { ...mockWellnessProfile, check_in_style: '' };
    render(<ProfileScreen />);
    expect(screen.queryByText('Check-ins')).toBeNull();
  });

  it('shows a connected-sources summary built only from sources actually reported connected', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('Apple Health · Strava')).toBeTruthy();
    expect(screen.queryByText('Apple Health · Strava · nothing else')).toBeNull();
  });

  it('navigates to the manage-sources screen when "Manage" is pressed', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Manage' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/manage-sources');
  });

  it('shows the exact "What Coreo knows about me" button copy (design-spec.md #24)', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('What Coreo knows about me')).toBeTruthy();
  });

  it('opens the notebook from the What Coreo knows about me control', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'What Coreo knows about me' }));
    expect(mockPush).toHaveBeenCalledWith('/profile/notebook');
  });

  it("uses the design's gradient and stroked-SVG treatment for profile controls", () => {
    render(<ProfileScreen />);

    const gradients = screen
      .UNSAFE_getAllByType(LinearGradient)
      .map((gradient) => gradient.props.colors);
    expect(gradients).toContainEqual(['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.25)']);
    expect(gradients).toContainEqual(['rgba(34,66,102,0.7)', 'rgba(12,28,48,0.8)']);
    expect(gradients).toContainEqual(['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.6)']);

    const paths = screen.UNSAFE_getAllByType(Path).map((path) => path.props.d);
    expect(paths).toContain('M15 18l-6-6 6-6');
    expect(paths).toContain('M9 18l6-6-6-6');
    expect(paths).toContain('M5 12h14M13 6l6 6-6 6');
  });
});
