/**
 * Issue #43 — 18c Chat presence (`design-spec.md` lines 7-77, plan.md "Design requirements").
 * `ChatPresenceScreen` is a new modal screen reached from the home "Ask me anything" bar. This file
 * protects: every copy line from the design, the typed-input path (the issue explicitly defers
 * voice capture), and — the two literal acceptance criteria from the issue — that nothing is
 * applied before the user taps "Apply", and that "Undo" actually calls the undo mutation.
 *
 * The three mutations are mocked at the hook level (not the network), each test setting the mock's
 * `data`/`isPending`/`error` to the state under test — the same pattern as
 * `tests/regression/nutrition/meal-plan-screen-states.test.tsx`.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import ChatPresenceScreen from '@/features/chat/screens/ChatPresenceScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockProposeMutate = jest.fn();
const mockConfirmMutate = jest.fn();
const mockUndoMutate = jest.fn();

let mockProposeState: { mutate: jest.Mock; isPending: boolean; data: unknown; error: unknown };
let mockConfirmState: { mutate: jest.Mock; isPending: boolean; data: unknown; error: unknown };
let mockUndoState: { mutate: jest.Mock; isPending: boolean; data: unknown; error: unknown };

jest.mock('@/features/chat/api/chatApi', () => ({
  useProposeChatMutation: () => mockProposeState,
  useConfirmChatMutation: () => mockConfirmState,
  useUndoChatMutation: () => mockUndoState,
}));

const FULL_MATCH_RESPONSE = {
  listening: 'Listening',
  heard: '"...skipped lunch, and I really don\'t feel like the gym."',
  line: "Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday.",
  receipts: [
    {
      pillar: 'fitness',
      kind: 'changed',
      label: 'Fitness moved',
      summary: 'Push session → 20-min walk on your 7 PM call',
      detail: 'Session moves to Thursday. The week still adds up.',
    },
    {
      pillar: 'diet',
      kind: 'suggested',
      label: 'Dinner set',
      summary: 'Dinner before 7:30, dal, rice, sabzi',
      detail: 'Covers the protein lunch missed. Late + heavy is the 4 AM wake.',
    },
    {
      pillar: 'wellness',
      kind: 'moved_up',
      label: 'Wind-down 9:30',
      summary: 'Wind-down starts 9:30 tonight, not 9:45',
      detail: 'Days like this one are exactly when it matters.',
    },
  ],
  hint: 'Hold to talk · tap the bubble to type',
  proposal_id: 'turn-1',
  requires_confirmation: true,
};

const NO_MATCH_RESPONSE = {
  listening: 'Listening',
  heard: 'just saying hi',
  line: null,
  receipts: [],
  hint: 'Hold to talk · tap the bubble to type',
  proposal_id: null,
  requires_confirmation: false,
};

function resetMocks() {
  jest.clearAllMocks();
  mockProposeState = { mutate: mockProposeMutate, isPending: false, data: undefined, error: null };
  mockConfirmState = { mutate: mockConfirmMutate, isPending: false, data: undefined, error: null };
  mockUndoState = { mutate: mockUndoMutate, isPending: false, data: undefined, error: null };
}

describe('ChatPresenceScreen: idle state (#43)', () => {
  beforeEach(resetMocks);

  it('renders the idle copy: Listening + hint', () => {
    render(<ChatPresenceScreen />);
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(screen.getByText('Hold to talk · tap the bubble to type')).toBeTruthy();
  });

  it('does not render a confirm/undo call before any message is proposed', () => {
    render(<ChatPresenceScreen />);
    expect(mockConfirmMutate).not.toHaveBeenCalled();
    expect(mockUndoMutate).not.toHaveBeenCalled();
  });

  it('closing navigates back without calling any mutation', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockBack).toHaveBeenCalled();
    expect(mockProposeMutate).not.toHaveBeenCalled();
  });

  it('tapping the type toggle reveals a focused text input', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Type a message' }));
    expect(screen.getByDisplayValue('')).toBeTruthy();
  });

  it('submit is disabled for a blank message and enabled once text is entered', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Type a message' }));
    const input = screen.getByDisplayValue('');

    fireEvent.changeText(input, '   ');
    fireEvent(input, 'submitEditing');
    expect(mockProposeMutate).not.toHaveBeenCalled();

    fireEvent.changeText(input, 'move my session to Thursday');
    fireEvent(input, 'submitEditing');
    expect(mockProposeMutate).toHaveBeenCalledWith(
      'move my session to Thursday',
      expect.anything(),
    );
  });

  it('submit is disabled past the 2000-character backend limit (services/chat.py:25,231-232)', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Type a message' }));
    const input = screen.getByDisplayValue('');

    fireEvent.changeText(input, 'a'.repeat(2001));
    fireEvent(input, 'submitEditing');

    expect(mockProposeMutate).not.toHaveBeenCalled();
  });

  it('shows a proposal failure inline instead of leaving an unexplained idle screen', () => {
    mockProposeState.error = { message: 'Something went wrong.' };
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });
});

describe('ChatPresenceScreen: proposed state, requires_confirmation (#43 AC 1 & 2)', () => {
  beforeEach(() => {
    resetMocks();
    mockProposeState.data = FULL_MATCH_RESPONSE;
  });

  it('renders heard, line, and every receipt chip label verbatim', () => {
    render(<ChatPresenceScreen />);
    expect(
      screen.getByText('"...skipped lunch, and I really don\'t feel like the gym."'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Then we don't. Walk your 7 PM call, eat a real dinner before 7:30, I've moved your session to Thursday.",
      ),
    ).toBeTruthy();
    expect(screen.getByText('Fitness moved')).toBeTruthy();
    expect(screen.getByText('Dinner set')).toBeTruthy();
    expect(screen.getByText('Wind-down 9:30')).toBeTruthy();
  });

  it('shows "Apply" but nothing has been confirmed yet (AC 2: nothing applied before confirm)', () => {
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(mockConfirmMutate).not.toHaveBeenCalled();
  });

  it('tapping "Apply" calls the confirm mutation with the exact proposal_id', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));
    expect(mockConfirmMutate).toHaveBeenCalledWith('turn-1', expect.anything());
  });

  it('a pending confirm disables "Apply" and still does not show "Undo"', () => {
    mockConfirmState.isPending = true;
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('button', { name: 'Apply' }).props.accessibilityState?.disabled).toBe(
      true,
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('a failed confirm keeps "Apply" visible and shows an inline error, not a silent apply', () => {
    mockConfirmState.error = { message: 'Something went wrong.' };
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
  });
});

describe('ChatPresenceScreen: applied state (#43 AC 3: undo works)', () => {
  beforeEach(() => {
    resetMocks();
    mockProposeState.data = FULL_MATCH_RESPONSE;
    mockConfirmState.data = {
      proposal_id: 'turn-1',
      applied: true,
      receipts: FULL_MATCH_RESPONSE.receipts,
    };
  });

  it('shows "Undo" and not "Apply" once confirm has actually succeeded', () => {
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('tapping "Undo" calls the undo mutation with the exact proposal_id', () => {
    render(<ChatPresenceScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(mockUndoMutate).toHaveBeenCalledWith('turn-1', expect.anything());
  });

  it('a failed undo keeps "Undo" visible and shows an inline error', () => {
    mockUndoState.error = { message: 'Something went wrong.' };
    render(<ChatPresenceScreen />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.getByText('Something went wrong.')).toBeTruthy();
  });
});

describe('ChatPresenceScreen: undone state returns to idle (#43 AC 3)', () => {
  beforeEach(() => {
    resetMocks();
    mockProposeState.data = FULL_MATCH_RESPONSE;
    mockConfirmState.data = {
      proposal_id: 'turn-1',
      applied: true,
      receipts: FULL_MATCH_RESPONSE.receipts,
    };
    mockUndoState.data = {
      proposal_id: 'turn-1',
      undone: true,
      receipts: FULL_MATCH_RESPONSE.receipts,
    };
  });

  it('clears the receipts/Apply/Undo and shows the idle hint again', () => {
    render(<ChatPresenceScreen />);
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.queryByText('Fitness moved')).toBeNull();
    expect(screen.getByText('Hold to talk · tap the bubble to type')).toBeTruthy();
  });

  it('shows a later proposal after the prior proposal was undone', () => {
    const view = render(<ChatPresenceScreen />);
    mockProposeState.data = NO_MATCH_RESPONSE;
    view.rerender(<ChatPresenceScreen />);
    expect(screen.getByText('just saying hi')).toBeTruthy();
  });
});

describe('ChatPresenceScreen: proposed state, no pillar matched (#43)', () => {
  beforeEach(() => {
    resetMocks();
    mockProposeState.data = NO_MATCH_RESPONSE;
  });

  it('shows only the echoed heard text — no line, no chips, no Apply', () => {
    render(<ChatPresenceScreen />);
    expect(screen.getByText('just saying hi')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
