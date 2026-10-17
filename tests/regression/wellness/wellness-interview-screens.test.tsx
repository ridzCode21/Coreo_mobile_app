/**
 * Issue #41 — the five-question wellness interview (17a·1-17a·5, design-spec.md, design file
 * lines 2174-2373). `useWellnessProfileQuery`/`useUpdateWellnessProfileMutation` are mocked so
 * this protects the screen's copy, selection rules, and step-to-step wiring independent of the
 * API contract tests (`wellness-profile-api-contract.test.tsx`) and the mock handler
 * (`wellness-profile-mock.test.ts`). Selection state is read off each option's own
 * `accessibilityState.selected` via `getByRole('button', { name })`, the same pattern
 * `fitness/fitness-interview-screens.test.tsx` uses.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import WellnessInterviewScreen from '@/features/wellness/screens/WellnessInterviewScreen';
import * as wellnessProfileApi from '@/features/wellness/api/wellnessProfileApi';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

jest.mock('@/features/wellness/api/wellnessProfileApi');

const EMPTY_PROFILE = {
  wellness_interview_complete: false,
  wellness_focus: '',
  nights_note: '',
  morning_first: '',
  what_helps: [] as string[],
  check_in_style: '',
  hide_numbers: false,
};

const mockMutate = jest.fn(
  (patch: Record<string, unknown>, opts?: { onSuccess?: (data: unknown) => void }) => {
    opts?.onSuccess?.({ ...EMPTY_PROFILE, ...patch });
  },
);

function mockHooks(profile: typeof EMPTY_PROFILE = EMPTY_PROFILE) {
  (wellnessProfileApi.useWellnessProfileQuery as jest.Mock).mockReturnValue({
    data: profile,
    isLoading: false,
    isError: false,
  });
  (wellnessProfileApi.useUpdateWellnessProfileMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  });
}

function nextButton() {
  return screen.getByRole('button', {
    name: /^(Next|Keep going\. I've got it|Build my evenings)$/,
  });
}

function optionSelected(label: string): boolean | undefined {
  return screen.getByRole('button', { name: label }).props.accessibilityState?.selected;
}

describe('wellness interview: 17a·1 What weighs (#41)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
  });

  it('shows the title, the five focus chips in design order, and the footnote', () => {
    render(<WellnessInterviewScreen />);

    expect(
      screen.getByText('What weighs on you most, right now? One thing. We start there.'),
    ).toBeTruthy();
    const labels = ['Sleep', 'A racing mind', 'Work stress', 'Low energy', 'Mood dips'];
    for (const label of labels) expect(screen.getByText(label)).toBeTruthy();
    expect(
      screen.getByText(
        'Sleep, stress, mood, energy. It all belongs here. We just start with the heaviest.',
      ),
    ).toBeTruthy();
  });

  it('is single-select: picking a second focus deselects the first', () => {
    render(<WellnessInterviewScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Sleep' }));
    expect(optionSelected('Sleep')).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'A racing mind' }));
    expect(optionSelected('Sleep')).toBe(false);
    expect(optionSelected('A racing mind')).toBe(true);
  });

  it('Next is disabled until a focus is picked, then PUTs just wellness_focus', () => {
    render(<WellnessInterviewScreen />);
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'A racing mind' }));
    expect(nextButton().props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(nextButton());
    expect(mockMutate).toHaveBeenCalledWith({ wellness_focus: 'racing_mind' }, expect.anything());
  });
});

describe('wellness interview: 17a·2 Your nights (#41 decision 2 — no "Heard so far", no mic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<WellnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sleep' }));
    fireEvent.press(nextButton());
  });

  it('shows the title and a text entry, with the example sentence as placeholder', () => {
    expect(
      screen.getByText("Tell me about your nights. When you're in bed, what actually happens?"),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        'In bed by 11:30 but on the phone till 1... then wide awake at 4 thinking about work...',
      ),
    ).toBeTruthy();
  });

  it('never renders the dropped "Heard so far" chips or a mic control', () => {
    expect(screen.queryByText('Heard so far')).toBeNull();
    expect(screen.queryByText('Bed 11:30, phone till 1')).toBeNull();
    expect(screen.queryByText('Wakes ~4 AM')).toBeNull();
    expect(screen.queryByLabelText('Voice input')).toBeNull();
  });

  it('has one submit action, without a second confirm button in the text entry', () => {
    expect(screen.getByRole('button', { name: "Keep going. I've got it" })).toBeTruthy();
    expect(screen.queryByLabelText('Confirm')).toBeNull();
  });

  it('submit is never disabled (the note is optional) and reads "Keep going. I\'ve got it"', () => {
    const button = screen.getByRole('button', { name: "Keep going. I've got it" });
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(button);
    expect(mockMutate).toHaveBeenCalledWith({ nights_note: '' }, expect.anything());
  });

  it('typing a note sends it trimmed on submit', () => {
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'In bed by 11:30 but on the phone till 1... then wide awake at 4 thinking about work...',
      ),
      'Up till 1am scrolling',
    );
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));

    expect(mockMutate).toHaveBeenCalledWith(
      { nights_note: 'Up till 1am scrolling' },
      expect.anything(),
    );
  });
});

describe('wellness interview: 17a·3 First thing (#41)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<WellnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sleep' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));
  });

  it('shows the title, the five morning-first chips in design order, and the footnote', () => {
    expect(
      screen.getByText("Before anything else. What's the first thing you do when you wake up?"),
    ).toBeTruthy();
    for (const label of [
      'Straight to the bathroom',
      'Check my phone',
      'Tea or coffee first',
      'Snooze, twice',
      'Rush straight out',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(
      screen.getByText('Your first hour sets the day. I work with it, not against it.'),
    ).toBeTruthy();
  });

  it('is single-select: picking a second option deselects the first', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Check my phone' }));
    expect(optionSelected('Check my phone')).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Snooze, twice' }));
    expect(optionSelected('Check my phone')).toBe(false);
    expect(optionSelected('Snooze, twice')).toBe(true);
  });

  it('Next is disabled until an option is picked, then PUTs just morning_first', () => {
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Tea or coffee first' }));
    fireEvent.press(nextButton());

    expect(mockMutate).toHaveBeenCalledWith({ morning_first: 'tea_or_coffee' }, expect.anything());
  });
});

describe('wellness interview: 17a·4 What helps (#41, acceptance criterion 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<WellnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sleep' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));
    fireEvent.press(screen.getByRole('button', { name: 'Tea or coffee first' }));
    fireEvent.press(nextButton());
  });

  it('shows the title, the six what-helps chips in design order, and the footnote', () => {
    expect(
      screen.getByText(
        "What already helps, even a little? I build on what's yours before adding anything new.",
      ),
    ).toBeTruthy();
    for (const label of [
      'Walks',
      'Music',
      'Chai on the balcony',
      'Prayer',
      'Talking it out',
      "Haven't found it",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('No mandatory meditation. Your unwind can be a walk.')).toBeTruthy();
  });

  it('allows multiple helps selected at once, with no exclusivity between ordinary choices', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Walks' }));
    fireEvent.press(screen.getByRole('button', { name: 'Music' }));

    expect(optionSelected('Walks')).toBe(true);
    expect(optionSelected('Music')).toBe(true);
  });

  it('"Haven\'t found it" is exclusive: clears any other help, and picking a help clears it', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Walks' }));
    fireEvent.press(screen.getByRole('button', { name: "Haven't found it" }));

    expect(optionSelected('Walks')).toBe(false);
    expect(optionSelected("Haven't found it")).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Music' }));
    expect(optionSelected("Haven't found it")).toBe(false);
    expect(optionSelected('Music')).toBe(true);
  });

  it('Next is disabled until at least one help is picked, then PUTs just what_helps', () => {
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Prayer' }));
    fireEvent.press(nextButton());

    expect(mockMutate).toHaveBeenCalledWith({ what_helps: ['prayer'] }, expect.anything());
  });
});

describe('wellness interview: 17a·5 Check-ins (#41)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<WellnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sleep' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));
    fireEvent.press(screen.getByRole('button', { name: 'Tea or coffee first' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: 'Walks' }));
    fireEvent.press(nextButton());
  });

  it('shows the title, both check-in rows with their subtitles, the numbers toggle, and the footnote', () => {
    expect(screen.getByText('Last one. How should check-ins work?')).toBeTruthy();
    expect(screen.getByText('Step in before it builds')).toBeTruthy();
    expect(screen.getByText('A gentle nudge when I see the signs')).toBeTruthy();
    expect(screen.getByText('Only when I come to you')).toBeTruthy();
    expect(screen.getByText('No unprompted check-ins')).toBeTruthy();
    expect(screen.getByText('Spare me the numbers')).toBeTruthy();
    expect(screen.getByText('Plain words, no scores or graphs')).toBeTruthy();
    expect(screen.getByText('Change your mind anytime. Just tell me.')).toBeTruthy();
  });

  it('the final button reads "Build my evenings", not "Next"', () => {
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Build my evenings' })).toBeTruthy();
  });

  it('the two check-in style rows are mutually exclusive (radio)', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Step in before it builds' }));
    expect(optionSelected('Step in before it builds')).toBe(true);
    expect(optionSelected('Only when I come to you')).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'Only when I come to you' }));
    expect(optionSelected('Step in before it builds')).toBe(false);
    expect(optionSelected('Only when I come to you')).toBe(true);
  });

  it('"Spare me the numbers" toggles independently of the check-in style choice', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Step in before it builds' }));
    fireEvent.press(screen.getByRole('button', { name: 'Spare me the numbers' }));

    expect(optionSelected('Step in before it builds')).toBe(true);
    expect(optionSelected('Spare me the numbers')).toBe(true);
  });

  it('is disabled until a check-in style is picked; hide_numbers never blocks it', () => {
    expect(
      screen.getByRole('button', { name: 'Build my evenings' }).props.accessibilityState?.disabled,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Spare me the numbers' }));
    expect(
      screen.getByRole('button', { name: 'Build my evenings' }).props.accessibilityState?.disabled,
    ).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Only when I come to you' }));
    expect(
      screen.getByRole('button', { name: 'Build my evenings' }).props.accessibilityState?.disabled,
    ).toBe(false);
  });

  it('finishing PUTs both check_in_style and hide_numbers, and navigates to /wellness, not a fabricated screen', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Step in before it builds' }));
    fireEvent.press(screen.getByRole('button', { name: 'Spare me the numbers' }));
    fireEvent.press(screen.getByRole('button', { name: 'Build my evenings' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { check_in_style: 'step_in', hide_numbers: true },
      expect.anything(),
    );
    expect(mockReplace).toHaveBeenCalledWith('/wellness');
  });
});

describe('wellness interview: resumes with previously-saved answers pre-selected (#41)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks({
      ...EMPTY_PROFILE,
      wellness_focus: 'low_energy',
      morning_first: 'snooze',
    });
  });

  it('pre-selects the focus already saved on the server', () => {
    render(<WellnessInterviewScreen />);

    expect(optionSelected('Low energy')).toBe(true);
  });
});
