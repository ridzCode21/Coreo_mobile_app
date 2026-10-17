/**
 * Issue #40 — 16c "This week's loop" (`design-spec.md:104-140`). `FitnessWeekScreen` is a new
 * pushed screen at `/fitness/week` (plan.md Decision 10). Mocks `useTrainingWeekQuery` directly.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { Svg } from 'react-native-svg';

import FitnessWeekScreen from '@/features/fitness/screens/FitnessWeekScreen';
import * as trainingWeekApi from '@/features/fitness/api/trainingWeekApi';
import { colors, componentSizes } from '@/shared/theme/tokens';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('@/features/fitness/api/trainingWeekApi');

function mockTrainingWeek(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (trainingWeekApi.useTrainingWeekQuery as jest.Mock).mockReturnValue(state);
}

const DONE_SESSION = {
  key: 'legs',
  name: 'Legs + core',
  weekday: 'monday',
  date: '2026-10-19',
  status: 'done',
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 6,
  note: null,
  progression_note: null,
  lighter_note: null,
  exercises: [],
};

const TODAY_SESSION = {
  key: 'push',
  name: 'Push, today',
  weekday: 'tuesday',
  date: '2026-10-20',
  status: 'today',
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 5,
  note: null,
  progression_note:
    "Bench is +2.5 kg from last week. Same lifts, heavier, that's the plan working.",
  lighter_note: null,
  exercises: [],
};

const UPCOMING_SESSION = {
  key: 'pull',
  name: 'Pull + hinge, back-safe',
  weekday: 'friday',
  date: '2026-10-23',
  status: 'upcoming',
  duration_min: 45,
  gear: 'dumbbells',
  movement_count: 6,
  note: null,
  progression_note: null,
  lighter_note: null,
  exercises: [],
};

const SPORT_SESSION = {
  key: 'sport',
  name: 'Cricket counts',
  weekday: 'sunday',
  date: '2026-10-25',
  status: 'upcoming',
  duration_min: null,
  gear: null,
  movement_count: 0,
  note: 'I plan around it, not against it',
  progression_note: null,
  lighter_note: null,
  exercises: [],
};

const FULL_WEEK = {
  training_week: {
    position: { week: 3, day: 2, label: 'Week 3 · Day 2' },
    status: 'in_progress',
    summary: 'Build muscle · dumbbells at home · 3 days · lower back protected',
    sessions: [DONE_SESSION, TODAY_SESSION, UPCOMING_SESSION, SPORT_SESSION],
    today: TODAY_SESSION,
  },
};

describe('FitnessWeekScreen: layout and copy (#40)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a loading state while the training week is loading', () => {
    mockTrainingWeek({ isLoading: true, isError: false, data: undefined });

    render(<FitnessWeekScreen />);

    expect(screen.queryByText("This week's loop")).toBeNull();
  });

  it('shows an inline error state on a query error', () => {
    mockTrainingWeek({ isLoading: false, isError: true, data: undefined });

    render(<FitnessWeekScreen />);

    expect(screen.getByText(/couldn.t|something went wrong|try again/i)).toBeTruthy();
  });

  it('renders the eyebrow, headline split, and summary verbatim', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    expect(screen.getByText("This week's loop")).toBeTruthy();
    expect(screen.getByText('Your week,', { exact: false })).toBeTruthy();
    expect(screen.getByText('built from what you told me.')).toBeTruthy();
    expect(
      screen.getByText('Build muscle · dumbbells at home · 3 days · lower back protected'),
    ).toBeTruthy();
  });

  it('shows a calm empty state when the API returns no sessions', () => {
    mockTrainingWeek({
      isLoading: false,
      isError: false,
      data: { training_week: { ...FULL_WEEK.training_week, sessions: [], today: null } },
    });

    render(<FitnessWeekScreen />);

    expect(screen.getByText('No sessions are planned for the rest of this week.')).toBeTruthy();
  });

  it('the back chevron calls router.back()', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);
    fireEvent.press(screen.getByRole('button', { name: /go back/i }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('renders one row per session with the exact done/today/upcoming/sport subtitles', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    expect(screen.getByText('Legs + core')).toBeTruthy();
    expect(screen.getByText('Monday · done · 6 movements')).toBeTruthy();

    expect(screen.getByText('Push, today')).toBeTruthy();
    expect(screen.getByText('45 min · 5 movements · bench +2.5 kg')).toBeTruthy();

    expect(screen.getByText('Pull + hinge, back-safe')).toBeTruthy();
    expect(screen.getByText('Friday · 45 min · 6 movements')).toBeTruthy();

    expect(screen.getByText('Cricket counts')).toBeTruthy();
    expect(screen.getByText('Sunday · I plan around it, not against it')).toBeTruthy();
  });

  it('uses the design ink strength for the done-row subtitle', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    expect(screen.getByText('Monday · done · 6 movements')).toHaveStyle({ color: colors.ink50 });
  });

  it('derives the sport row text from the API, not a hardcoded "Cricket"', () => {
    mockTrainingWeek({
      isLoading: false,
      isError: false,
      data: {
        training_week: {
          ...FULL_WEEK.training_week,
          sessions: [{ ...SPORT_SESSION, name: 'Football counts' }],
        },
      },
    });

    render(<FitnessWeekScreen />);

    expect(screen.getByText('Football counts')).toBeTruthy();
    expect(screen.queryByText('Cricket counts')).toBeNull();
  });

  it('trims the footer (no "800+ movements") and shows no "Swap a session" control (Decision 3)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    expect(
      screen.getByText(
        'Same loop for 4 weeks, weights creep up, so you can see yourself get stronger.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/800\+ movements/i)).toBeNull();
    expect(screen.queryByText('Swap a session')).toBeNull();
    expect(screen.queryByRole('button', { name: /swap a session/i })).toBeNull();
  });

  it('the done-row checkmark is a 12×12 svg with the shared done stroke width (round-4 regression, plan.md Decision 8)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    const svgs = screen.UNSAFE_getAllByType(Svg);
    const checkmark = svgs.find((node) => node.props.width === 12 && node.props.height === 12);
    expect(checkmark).toBeDefined();

    const Path = checkmark!.props.children;
    const pathNode = Array.isArray(Path) ? Path[0] : Path;
    expect(pathNode.props.strokeWidth).toBe(componentSizes.planDoneStrokeWidth);
  });

  it('the today-row chevron uses the shared header stroke width, not a hardcoded number (round-4 regression)', () => {
    mockTrainingWeek({ isLoading: false, isError: false, data: FULL_WEEK });

    render(<FitnessWeekScreen />);

    const svgs = screen.UNSAFE_getAllByType(Svg);
    const chevrons = svgs.filter(
      (node) =>
        node.props.width === componentSizes.replaceBackIcon &&
        node.props.height === componentSizes.replaceBackIcon,
    );
    // one in the header back button, one as the today-row trailing chevron
    expect(chevrons.length).toBeGreaterThanOrEqual(2);
    for (const svg of chevrons) {
      const child = Array.isArray(svg.props.children) ? svg.props.children[0] : svg.props.children;
      expect(child.props.strokeWidth).toBe(componentSizes.planHeaderStrokeWidth);
    }
  });
});
