/**
 * Issue #42 — 17c "Right now" (`design-spec.md` lines ~177-217). `RightNowScreen` is a new modal
 * screen, only ever reached when `GET /users/me/right-now/` returns a non-null `breath`
 * (`useRightNowCheck`, tested separately in `use-right-now-check.test.ts`). This file protects the
 * screen's own rendering given a `breath` prop/query result — not the navigation trigger.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import RightNowScreen from '@/features/wellness/screens/RightNowScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const BREATH = {
  eyebrow: 'Right now',
  headline: "Your heart's been running for twenty minutes. Let's slow it together.",
  cue: 'Breathe out',
  pattern: 'In for 4 · hold for 7 · out for 8',
  line: 'Nothing to pick. Just this, six times.',
  not_now: 'Not now',
  im_here: "I'm here",
};

describe('RightNowScreen: 17c content (#42)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders every copy line from the API verbatim', () => {
    render(<RightNowScreen breath={BREATH} />);

    expect(screen.getByText('Right now')).toBeTruthy();
    expect(
      screen.getByText("Your heart's been running for twenty minutes. Let's slow it together."),
    ).toBeTruthy();
    expect(screen.getByText('Breathe out')).toBeTruthy();
    expect(screen.getByText('In for 4 · hold for 7 · out for 8')).toBeTruthy();
    expect(screen.getByText('Nothing to pick. Just this, six times.')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();
    expect(screen.getByText("I'm here")).toBeTruthy();
  });

  it('never renders a heart-rate number, even when the API payload includes one (plan.md Decision 6)', () => {
    render(<RightNowScreen breath={{ ...BREATH, heart_rate: 142 }} />);

    expect(screen.queryByText('142')).toBeNull();
    expect(screen.queryByText(/142/)).toBeNull();
  });

  it('"Not now" dismisses the screen', () => {
    render(<RightNowScreen breath={BREATH} />);
    fireEvent.press(screen.getByText('Not now'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('"I\'m here" dismisses the screen', () => {
    render(<RightNowScreen breath={BREATH} />);
    fireEvent.press(screen.getByText("I'm here"));

    expect(mockBack).toHaveBeenCalled();
  });
});
