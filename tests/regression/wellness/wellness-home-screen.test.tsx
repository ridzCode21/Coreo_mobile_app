/**
 * Issue #42 — 17b "Wellness home" (`design-spec.md` lines ~9-78). `WellnessHomeScreen` replaces
 * the issue-#41 "coming soon" placeholder with the real tonight's-wind-down card. Mocks
 * `useWindDownQuery` directly, independent of the mock-router test (`wind-down-mock.test.ts`).
 * Mirrors `fitness/fitness-home-screen.test.tsx`.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import WellnessHomeScreen from '@/features/wellness/screens/WellnessHomeScreen';
import * as windDownApi from '@/features/wellness/api/windDownApi';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

jest.mock('@/features/wellness/api/windDownApi');

function mockWindDown(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (windDownApi.useWindDownQuery as jest.Mock).mockReturnValue(state);
}

const FULL_WIND_DOWN = {
  wind_down: {
    clock: '9:12 PM',
    headline: 'Your day ran hot. Tonight we land it early.',
    title: "Tonight's wind-down",
    lights_out: '10:45',
    steps: [
      { time: '9:45', text: 'phone goes to the kitchen', reason: 'the 1 AM fix' },
      { time: '10:00', text: 'chai on the balcony, no screens', reason: 'yours already' },
      { time: '10:30', text: 'six slow breaths in bed', reason: '2 min, guided' },
    ],
    line: 'One routine, built from your interview. No library to scroll.',
    reason: 'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
    pushed: false,
  },
};

describe('WellnessHomeScreen: gating (#42)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a loading state while wind-down is loading, no flash of the wrong screen', () => {
    mockWindDown({ isLoading: true, isError: false, data: undefined });

    render(<WellnessHomeScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText("Tonight's wind-down")).toBeNull();
  });

  it('shows an inline error state on a query error', () => {
    mockWindDown({ isLoading: false, isError: true, data: undefined });

    render(<WellnessHomeScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
  });

  it('redirects to the wellness interview when wind_down is null (wind_down.py:73-74)', () => {
    mockWindDown({ isLoading: false, isError: false, data: { wind_down: null } });

    render(<WellnessHomeScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/wellness-interview');
  });
});

describe('WellnessHomeScreen: 17b content (#42)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindDown({ isLoading: false, isError: false, data: FULL_WIND_DOWN });
  });

  it('renders the eyebrow, time pill (verbatim from the API), and headline', () => {
    render(<WellnessHomeScreen />);

    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('9:12 PM')).toBeTruthy();
    expect(screen.getByText('Your day ran hot. Tonight we land it early.')).toBeTruthy();
  });

  it('renders the wind-down card title, lights-out time, and footer line', () => {
    render(<WellnessHomeScreen />);

    expect(screen.getByText("Tonight's wind-down")).toBeTruthy();
    expect(screen.getByText('Lights out 10:45')).toBeTruthy();
    expect(
      screen.getByText('One routine, built from your interview. No library to scroll.'),
    ).toBeTruthy();
  });

  it('renders exactly the 3 API steps as "{time}, {text}" with the reason alongside (design-spec.md 17b markup)', () => {
    render(<WellnessHomeScreen />);

    expect(screen.getByText('9:45, phone goes to the kitchen')).toBeTruthy();
    expect(screen.getByText('the 1 AM fix')).toBeTruthy();
    expect(screen.getByText('10:00, chai on the balcony, no screens')).toBeTruthy();
    expect(screen.getByText('yours already')).toBeTruthy();
    expect(screen.getByText('10:30, six slow breaths in bed')).toBeTruthy();
    expect(screen.getByText('2 min, guided')).toBeTruthy();
  });

  it('renders the "Why tonight matters" card with the API reason verbatim', () => {
    render(<WellnessHomeScreen />);

    expect(screen.getByText('Why tonight matters')).toBeTruthy();
    expect(
      screen.getByText(
        'Two short nights in a row, and tomorrow is a push day. Sleep is the workout tonight.',
      ),
    ).toBeTruthy();
  });

  it('hides the plain-words bar when plain_words is absent', () => {
    render(<WellnessHomeScreen />);

    expect(screen.queryByText(/you asked for plain words/i)).toBeNull();
  });

  it('shows the plain-words bar verbatim only when plain_words is present', () => {
    mockWindDown({
      isLoading: false,
      isError: false,
      data: {
        wind_down: {
          ...FULL_WIND_DOWN.wind_down,
          plain_words:
            'You asked for plain words, no scores here. The graphs exist if you ever want them.',
        },
      },
    });

    render(<WellnessHomeScreen />);

    expect(
      screen.getByText(
        'You asked for plain words, no scores here. The graphs exist if you ever want them.',
      ),
    ).toBeTruthy();
  });

  it('"Start the wind-down" and "Something on your mind? Say it" render but are not pressable buttons (plan.md Decision 5, PARTIAL)', () => {
    render(<WellnessHomeScreen />);

    expect(screen.getByText('Start the wind-down')).toBeTruthy();
    expect(screen.getByText('Something on your mind? Say it')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start the wind-down/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /something on your mind/i })).toBeNull();
  });

  it('the back chevron calls router.back()', () => {
    render(<WellnessHomeScreen />);
    fireEvent.press(screen.getByRole('button', { name: /go back/i }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('never renders an invented number — the clock is the API string, not a client-computed time', () => {
    render(<WellnessHomeScreen />);

    expect(screen.queryByText('9:00 PM')).toBeNull();
    expect(screen.getByText('9:12 PM')).toBeTruthy();
  });
});
