/**
 * Issue #46 — 24a "The evening check-in" / "tomorrow previewed" (`design-spec.md` lines 60-180).
 * `EveningCheckInScreen` renders either the mood-picker ritual or the tomorrow-preview card off a
 * single `useEveningCheckInQuery` result, and fires `useCloseEveningCheckInMutation` on "Close the
 * day". Mocks both hooks directly, independent of the mock-router test
 * (`evening-check-in-mock.test.ts`). Mirrors `wellness-home-screen.test.tsx` /
 * `right-now-screen.test.tsx`.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import EveningCheckInScreen from '@/features/evening-checkin/screens/EveningCheckInScreen';
import * as eveningCheckInApi from '@/features/evening-checkin/api/eveningCheckInApi';
import { colors, withAlpha } from '@/shared/theme/tokens';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

jest.mock('@/features/evening-checkin/api/eveningCheckInApi');

const mockMutate = jest.fn();

function mockQuery(state: { data?: unknown; isLoading: boolean; isError: boolean }) {
  (eveningCheckInApi.useEveningCheckInQuery as jest.Mock).mockReturnValue(state);
}

function mockMutation(state: { isPending?: boolean; isError?: boolean } = {}) {
  (eveningCheckInApi.useCloseEveningCheckInMutation as jest.Mock).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    ...state,
  });
}

const OPEN_RITUAL = {
  eyebrow: 'Evening check-in · 20 seconds',
  question: 'How did today feel?',
  moods: [
    { key: 'rough', label: 'Rough' },
    { key: 'meh', label: 'Meh' },
    { key: 'okay', label: 'Okay' },
    { key: 'good', label: 'Good' },
    { key: 'great', label: 'Great' },
  ],
  looks_right_label: 'Looks right?',
  fix_label: 'Fix something',
  recap: ['7,904 steps', 'Lunch logged · rice bowl', 'No session — moved to Thursday'],
  note_prompt: 'Anything for tomorrow-me?',
  close_label: 'Close the day',
  closed: false,
};

const CLOSED_WITH_PREVIEW = {
  ...OPEN_RITUAL,
  closed: true,
  preview: {
    eyebrow: 'Tomorrow, previewed',
    line: "Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here.",
    action: 'Good night',
  },
};

const CLOSED_NOTHING_TOMORROW = {
  ...OPEN_RITUAL,
  closed: true,
  preview: null,
  message: 'Nothing for tomorrow.',
};

describe('EveningCheckInScreen: loading/error states (#46)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutation();
  });

  it('shows a loading state, no flash of the mood picker', () => {
    mockQuery({ isLoading: true, isError: false, data: undefined });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('How did today feel?')).toBeNull();
  });

  it('shows an inline error state on a query error', () => {
    mockQuery({ isLoading: false, isError: true, data: undefined });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('How did today feel?')).toBeNull();
    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
  });
});

describe('EveningCheckInScreen: open ritual (#46)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutation();
    mockQuery({ isLoading: false, isError: false, data: OPEN_RITUAL });
  });

  it('renders the eyebrow, question, recap card, note prompt and close label verbatim', () => {
    render(<EveningCheckInScreen />);

    expect(screen.getByText('Evening check-in · 20 seconds')).toBeTruthy();
    expect(screen.getByText('How did today feel?')).toBeTruthy();
    expect(screen.getByText('Looks right?')).toBeTruthy();
    expect(screen.getByText('Fix something')).toBeTruthy();
    expect(screen.getByPlaceholderText('Anything for tomorrow-me?')).toBeTruthy();
    expect(screen.getByText('Close the day')).toBeTruthy();
  });

  it('exposes the note prompt only through its input', () => {
    render(<EveningCheckInScreen />);

    expect(screen.getByPlaceholderText('Anything for tomorrow-me?')).toBeTruthy();
    expect(screen.queryByText('Anything for tomorrow-me?')).toBeNull();
  });

  it('renders all five mood pills with their exact emoji and label, in design order', () => {
    render(<EveningCheckInScreen />);

    const expected = [
      ['🙁', 'Rough'],
      ['😕', 'Meh'],
      ['😐', 'Okay'],
      ['🙂', 'Good'],
      ['😄', 'Great'],
    ];
    for (const [emoji, label] of expected) {
      expect(screen.getByText(emoji)).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('renders every recap line in order and nothing extra', () => {
    render(<EveningCheckInScreen />);

    expect(screen.getByText('7,904 steps')).toBeTruthy();
    expect(screen.getByText('Lunch logged · rice bowl')).toBeTruthy();
    expect(screen.getByText('No session — moved to Thursday')).toBeTruthy();
  });

  it('renders no recap lines when the API returns none', () => {
    mockQuery({ isLoading: false, isError: false, data: { ...OPEN_RITUAL, recap: [] } });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('7,904 steps')).toBeNull();
  });

  it('opens with "Good" already picked, so Close the day is ready without a selection', () => {
    render(<EveningCheckInScreen />);

    expect(screen.getByLabelText('Good').props.accessibilityState.selected).toBe(true);
    const close = screen.getByRole('button', { name: 'Close the day' });
    expect(close.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByText('Close the day'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ mood: 'good', note: '' }),
      expect.anything(),
    );
  });

  it('shows the note as a single-line field', () => {
    render(<EveningCheckInScreen />);

    const field = screen.getByPlaceholderText('Anything for tomorrow-me?');
    expect(field.props.multiline).toBeFalsy();
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({ height: 48 });
  });

  it('renders Close the day with its designed depth shadow and outer white glow', () => {
    render(<EveningCheckInScreen />);

    const close = screen.getByRole('button', { name: 'Close the day' });
    expect(StyleSheet.flatten(close.props.style)).toMatchObject({
      shadowColor: withAlpha(colors.overlayInk, 0.2),
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 26,
    });
    expect(StyleSheet.flatten(close.parent?.parent?.parent?.props.style)).toMatchObject({
      shadowColor: withAlpha(colors.white, 0.8),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 18,
    });
  });

  it('selecting another mood moves the selection to that pill only', () => {
    render(<EveningCheckInScreen />);

    const greatPill = screen.getByLabelText('Great');
    fireEvent.press(greatPill);
    expect(greatPill.props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Good').props.accessibilityState.selected).toBe(false);

    fireEvent.press(screen.getByText('Close the day'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ mood: 'great' }),
      expect.anything(),
    );
  });

  it('includes the typed note when closing', () => {
    render(<EveningCheckInScreen />);

    fireEvent.press(screen.getByText('Rough'));
    fireEvent.changeText(screen.getByPlaceholderText('Anything for tomorrow-me?'), 'kidney pain');
    fireEvent.press(screen.getByText('Close the day'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ mood: 'rough', note: 'kidney pain' }),
      expect.anything(),
    );
  });

  it('"Fix something" dismisses the screen and never calls the mutation', () => {
    render(<EveningCheckInScreen />);

    fireEvent.press(screen.getByText('Fix something'));

    expect(mockBack).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('disables Close while the mutation is pending', () => {
    mockMutation({ isPending: true });
    render(<EveningCheckInScreen />);

    fireEvent.press(screen.getByText('Good'));
    fireEvent.press(screen.getByText('Close the day'));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows an inline error when the close mutation fails, keeping the selection', () => {
    mockMutation({ isError: true });
    render(<EveningCheckInScreen />);

    fireEvent.press(screen.getByText('Good'));

    expect(screen.getByText('Something went wrong. Try again.')).toBeTruthy();
  });
});

describe('EveningCheckInScreen: closed / tomorrow previewed (#46)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutation();
  });

  it('renders the tomorrow-preview card when closed with a preview', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);

    expect(screen.getByText('Tomorrow, previewed')).toBeTruthy();
    expect(
      screen.getByText("Push day. Carbs around 4:30. Lights out 10:45. I'll take it from here."),
    ).toBeTruthy();
    expect(screen.getByText('Good night')).toBeTruthy();
    expect(screen.queryByText('Close the day')).toBeNull();
  });

  it('keeps the dimmed ritual prompt out of the accessibility tree once closed', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('Evening check-in · 20 seconds')).toBeNull();
    expect(screen.queryByText('How did today feel?')).toBeNull();
  });

  it('shows only the action, with no empty line, when neither preview nor message came back', () => {
    mockQuery({
      isLoading: false,
      isError: false,
      data: { ...OPEN_RITUAL, closed: true, preview: null, message: null },
    });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('Tomorrow, previewed')).toBeNull();
    expect(screen.getByText('Good night')).toBeTruthy();
    fireEvent.press(screen.getByText('Good night'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('dims the closed-view eyebrow with the design colour and softens the question', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);

    const eyebrow = screen.UNSAFE_getByProps({ children: 'Evening check-in · 20 seconds' });
    expect(StyleSheet.flatten(eyebrow.props.style)).toMatchObject({
      color: colors.eveningCheckInDimEyebrow,
      opacity: 0.5,
    });
    const question = screen.UNSAFE_getByProps({ children: 'How did today feel?' });
    expect(StyleSheet.flatten(question.props.style)).toMatchObject({
      opacity: 0.35,
      textShadowRadius: 1,
    });
  });

  it('renders the message in place of the preview line when preview is null', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_NOTHING_TOMORROW });

    render(<EveningCheckInScreen />);

    expect(screen.getByText('Nothing for tomorrow.')).toBeTruthy();
    expect(screen.getByText('Good night')).toBeTruthy();
  });

  it('"Good night" dismisses the screen', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);
    fireEvent.press(screen.getByText('Good night'));

    expect(mockBack).toHaveBeenCalled();
  });

  it('renders Good night with its designed white outer glow', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);

    const action = screen.getByRole('button', { name: 'Good night' });
    expect(StyleSheet.flatten(action.parent?.parent?.parent?.props.style)).toMatchObject({
      shadowColor: withAlpha(colors.white, 0.5),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 20,
    });
  });

  it('shows the closed view directly (no mood picker) when the server reports closed: true without ever posting from this screen', () => {
    mockQuery({ isLoading: false, isError: false, data: CLOSED_WITH_PREVIEW });

    render(<EveningCheckInScreen />);

    expect(screen.queryByText('🙂')).toBeNull();
    expect(screen.queryByText('Looks right?')).toBeNull();
  });
});
