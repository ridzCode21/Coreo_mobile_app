/**
 * Issue #39 — the five-question fitness interview (16a·1-16a·5, design-spec.md, design file lines
 * 1846-2039). `useFitnessProfileQuery`/`useUpdateFitnessProfileMutation` are mocked so this
 * protects the screen's copy, selection rules, and step-to-step wiring independent of the API
 * contract tests (`fitness-profile-api-contract.test.tsx`) and the mock handler
 * (`fitness-profile-mock.test.ts`). Selection state is read off each option's own
 * `accessibilityState.selected` via `getByRole('button', { name })` (the same pattern
 * `onboarding/pillars-screen.test.tsx` uses for `NextBar`), not by reaching into render internals.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import FitnessInterviewScreen from '@/features/fitness/screens/FitnessInterviewScreen';
import * as fitnessProfileApi from '@/features/fitness/api/fitnessProfileApi';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

jest.mock('@/features/fitness/api/fitnessProfileApi');

const EMPTY_PROFILE = {
  fitness_interview_complete: false,
  fitness_goal: '',
  training_places: [] as string[],
  movement_note: '',
  sports: [] as string[],
  protected_areas: [] as string[],
};

const mockMutate = jest.fn(
  (patch: Record<string, unknown>, opts?: { onSuccess?: (data: unknown) => void }) => {
    opts?.onSuccess?.({ ...EMPTY_PROFILE, ...patch });
  },
);

function mockHooks(profile: typeof EMPTY_PROFILE = EMPTY_PROFILE) {
  (fitnessProfileApi.useFitnessProfileQuery as jest.Mock).mockReturnValue({
    data: profile,
    isLoading: false,
    isError: false,
  });
  (fitnessProfileApi.useUpdateFitnessProfileMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  });
}

function nextButton() {
  return screen.getByRole('button', {
    name: /^(Next|Keep going\. I've got it|Build my training week)$/,
  });
}

function optionSelected(label: string): boolean | undefined {
  return screen.getByRole('button', { name: label }).props.accessibilityState?.selected;
}

describe('fitness interview: 16a·1 Goal (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
  });

  it('shows the title, the five goals in design order, and the footnote', () => {
    render(<FitnessInterviewScreen />);

    expect(screen.getByText('What are we building?')).toBeTruthy();
    const labels = [
      'Get stronger',
      'Build muscle',
      'Lose fat, keep muscle',
      'Move better, more energy',
      'A race or event',
    ];
    for (const label of labels) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText('One goal at a time. We can change it any month.')).toBeTruthy();
  });

  it('is single-select: picking a second goal deselects the first', () => {
    render(<FitnessInterviewScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Get stronger' }));
    expect(optionSelected('Get stronger')).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Build muscle' }));
    expect(optionSelected('Get stronger')).toBe(false);
    expect(optionSelected('Build muscle')).toBe(true);
  });

  it('Next is disabled until a goal is picked, then PUTs just fitness_goal', () => {
    render(<FitnessInterviewScreen />);
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Build muscle' }));
    expect(nextButton().props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(nextButton());
    expect(mockMutate).toHaveBeenCalledWith({ fitness_goal: 'build_muscle' }, expect.anything());
  });
});

describe('fitness interview: 16a·2 Place (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<FitnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Get stronger' }));
    fireEvent.press(nextButton());
  });

  it('shows the title, the four places in design order, and the footnote', () => {
    expect(
      screen.getByText('Where will this actually happen? I only build with what you have.'),
    ).toBeTruthy();
    for (const label of [
      'A full gym',
      'Home, dumbbells and a band',
      'Just my bodyweight',
      'Outdoors, mostly',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Pick more than one if life splits between them.')).toBeTruthy();
  });

  it('allows multiple places selected at once, with no exclusivity', () => {
    fireEvent.press(screen.getByRole('button', { name: 'A full gym' }));
    fireEvent.press(screen.getByRole('button', { name: 'Outdoors, mostly' }));

    expect(optionSelected('A full gym')).toBe(true);
    expect(optionSelected('Outdoors, mostly')).toBe(true);
  });

  it('Next is disabled until at least one place is picked, then PUTs just training_places', () => {
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Home, dumbbells and a band' }));
    expect(nextButton().props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(nextButton());
    expect(mockMutate).toHaveBeenCalledWith(
      { training_places: ['home_dumbbells_band'] },
      expect.anything(),
    );
  });
});

describe('fitness interview: 16a·3 Movement (#39 decision 4 — no "Heard so far", no mic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<FitnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Get stronger' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: 'A full gym' }));
    fireEvent.press(nextButton());
  });

  it('shows the title and a text entry, with the example sentence as placeholder', () => {
    expect(
      screen.getByText(
        'Tell me what moving looks like now. A normal week, gym or not, all of it counts.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        'Desk job, walk the dog twice a day, gym maybe twice when work is calm, cricket on Sundays...',
      ),
    ).toBeTruthy();
  });

  it('never renders the dropped "Heard so far" chips or a mic control', () => {
    expect(screen.queryByText('Heard so far')).toBeNull();
    expect(screen.queryByText('Desk job')).toBeNull();
    expect(screen.queryByText('Daily walks ×2')).toBeNull();
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
    expect(mockMutate).toHaveBeenCalledWith({ movement_note: '' }, expect.anything());
  });

  it('typing a note sends it trimmed on submit', () => {
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'Desk job, walk the dog twice a day, gym maybe twice when work is calm, cricket on Sundays...',
      ),
      'Cricket on Sundays',
    );
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));

    expect(mockMutate).toHaveBeenCalledWith(
      { movement_note: 'Cricket on Sundays' },
      expect.anything(),
    );
  });
});

describe('fitness interview: 16a·4 Sports (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<FitnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Get stronger' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: 'A full gym' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));
  });

  it('shows the title (with emphasis clause), the six sports in design order, and the footnote', () => {
    expect(screen.getByText(/Do you play anything\?/)).toBeTruthy();
    expect(screen.getByText('Sport counts as training.')).toBeTruthy();
    for (const label of [
      'Cricket',
      'Football',
      'Badminton',
      'Running',
      'Swimming',
      'Nothing regular',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(
      screen.getByText('Match days shape the week. Legs rest before, recovery after.'),
    ).toBeTruthy();
  });

  it('allows multiple sports at once', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Cricket' }));
    fireEvent.press(screen.getByRole('button', { name: 'Football' }));

    expect(optionSelected('Cricket')).toBe(true);
    expect(optionSelected('Football')).toBe(true);
  });

  it('"Nothing regular" clears any other sport, and picking a sport clears "Nothing regular"', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Cricket' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nothing regular' }));

    expect(optionSelected('Cricket')).toBe(false);
    expect(optionSelected('Nothing regular')).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Football' }));
    expect(optionSelected('Nothing regular')).toBe(false);
    expect(optionSelected('Football')).toBe(true);
  });

  it('Next is disabled until a sport is picked, then PUTs just sports', () => {
    expect(nextButton().props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Cricket' }));
    fireEvent.press(nextButton());

    expect(mockMutate).toHaveBeenCalledWith({ sports: ['cricket'] }, expect.anything());
  });
});

describe('fitness interview: 16a·5 Protect (#39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
    render(<FitnessInterviewScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Get stronger' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: 'A full gym' }));
    fireEvent.press(nextButton());
    fireEvent.press(screen.getByRole('button', { name: "Keep going. I've got it" }));
    fireEvent.press(screen.getByRole('button', { name: 'Cricket' }));
    fireEvent.press(nextButton());
  });

  it('shows the title, the five protected areas in design order, and the footnote', () => {
    expect(
      screen.getByText(
        'Last one. Anything we train around? Old injuries, cranky joints, I never program into pain.',
      ),
    ).toBeTruthy();
    for (const label of ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'Nothing to flag']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Tell me more in your own words anytime, I remember.')).toBeTruthy();
  });

  it('the final button reads "Build my training week", not "Next"', () => {
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Build my training week' })).toBeTruthy();
  });

  it('"Nothing to flag" clears any other area, and picking an area clears "Nothing to flag"', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Knees' }));
    fireEvent.press(screen.getByRole('button', { name: 'Nothing to flag' }));

    expect(optionSelected('Knees')).toBe(false);
    expect(optionSelected('Nothing to flag')).toBe(true);
  });

  it('finishing PUTs protected_areas and navigates to the fitness tab, not a fabricated screen', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Lower back' }));
    fireEvent.press(screen.getByRole('button', { name: 'Build my training week' }));

    expect(mockMutate).toHaveBeenCalledWith({ protected_areas: ['lower_back'] }, expect.anything());
    expect(mockReplace).toHaveBeenCalledWith('/fitness');
  });
});

describe('fitness interview: resumes with previously-saved answers pre-selected (#39 decision 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks({
      ...EMPTY_PROFILE,
      fitness_goal: 'build_muscle',
      training_places: ['home_dumbbells_band'],
    });
  });

  it('pre-selects the goal already saved on the server', () => {
    render(<FitnessInterviewScreen />);

    expect(optionSelected('Build muscle')).toBe(true);
  });
});
