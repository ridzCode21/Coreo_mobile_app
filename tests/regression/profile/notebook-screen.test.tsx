import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import NotebookScreen from '@/features/profile/screens/NotebookScreen';

const mockCorrectMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockDeleteAllMutate = jest.fn();
type MockFact = {
  id: string;
  text: string;
  source_label: string;
  stored_at: string;
  badge: string | null;
};

let mockIsError = false;
let mockFacts: MockFact[] = [
  {
    id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
    text: 'Vegetarian. Peanuts are off the table, allergy.',
    source_label: 'From your interview · March',
    stored_at: '2026-03-01T00:00:00+00:00',
    badge: null,
  },
];

jest.mock('@/features/profile/api/memoryFactsApi', () => ({
  useMemoryFactsQuery: () => ({
    data: mockIsError
      ? undefined
      : {
          eyebrow: "Coreo's notebook",
          title: 'What I know about you.',
          subtitle: 'Correct me anytime.',
          footer:
            'This is everything I hold. Delete a line and I forget it. Delete it all and we start clean.',
          prompt: 'Something I got wrong? Tell me',
          facts: mockFacts,
        },
    isLoading: false,
    isError: mockIsError,
  }),
  useCorrectMemoryFactMutation: () => ({ mutate: mockCorrectMutate, isPending: false }),
  useDeleteMemoryFactMutation: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useDeleteAllMemoryFactsMutation: () => ({ mutate: mockDeleteAllMutate, isPending: false }),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

describe('profile notebook screen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockIsError = false;
    mockFacts = [
      {
        id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
        text: 'Vegetarian. Peanuts are off the table, allergy.',
        source_label: 'From your interview · March',
        stored_at: '2026-03-01T00:00:00+00:00',
        badge: null,
      },
    ];
    mockCorrectMutate.mockClear();
    mockDeleteMutate.mockClear();
    mockDeleteAllMutate.mockClear();
  });

  it('renders the inline 25px headline, prompt icon, and correction label without its UUID', () => {
    render(<NotebookScreen />);

    expect(screen.getByText("Coreo's notebook")).toBeTruthy();
    expect(screen.getByText('What I know about you. Correct me anytime.')).toBeTruthy();
    expect(screen.getByText('Correct me anytime.')).toBeTruthy();
    expect(screen.getByLabelText('Notebook prompt icon')).toBeTruthy();
    expect(screen.getByText('Vegetarian. Peanuts are off the table, allergy.')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Correct: Vegetarian. Peanuts are off the table, allergy.',
      }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/18e639d8/)).toBeNull();
  });

  it('uses the New badge as the correction affordance without adding a pencil button', () => {
    mockFacts = [
      {
        id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
        text: 'Rice bowls: your portions run bigger than my first guess. Learned.',
        source_label: 'Learned last week · from your fix',
        stored_at: '2026-03-01T00:00:00+00:00',
        badge: 'New',
      },
    ];

    render(<NotebookScreen />);

    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.queryByLabelText(/Correct:/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Correct new memory' }));
    expect(screen.getByLabelText('Correction')).toBeTruthy();
  });

  it('shows an honest error message instead of a spinner when the fetch fails', () => {
    mockIsError = true;
    render(<NotebookScreen />);

    expect(screen.getByText('Unable to load your notebook.')).toBeTruthy();
  });

  it('keeps the New badge in sentence case and uses the shared Back button', () => {
    mockFacts = [
      {
        id: '18e639d8-2454-4a94-8fd1-6c062729bf35',
        text: 'Rice bowls: your portions run bigger than my first guess. Learned.',
        source_label: 'Learned last week · from your fix',
        stored_at: '2026-03-01T00:00:00+00:00',
        badge: 'New',
      },
    ];
    render(<NotebookScreen />);

    const badgeStyle = StyleSheet.flatten(screen.getByText('New').props.style);
    expect(badgeStyle.textTransform).toBeUndefined();
    expect(badgeStyle.letterSpacing).toBe(0);
    expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1);
  });

  it('renders an honest empty notebook without made-up empty copy', () => {
    mockFacts = [];
    render(<NotebookScreen />);

    expect(screen.getByText("Coreo's notebook")).toBeTruthy();
    expect(screen.queryByText(/nothing remembered|no memories/i)).toBeNull();
  });

  it('sends only the corrected text and gates deletion until native confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<NotebookScreen />);

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Correct: Vegetarian. Peanuts are off the table, allergy.',
      }),
    );
    fireEvent.changeText(screen.getByLabelText('Correction'), ' Updated memory ');
    fireEvent.press(screen.getByRole('button', { name: 'Save correction' }));
    await waitFor(() =>
      expect(mockCorrectMutate).toHaveBeenCalledWith(
        { id: '18e639d8-2454-4a94-8fd1-6c062729bf35', text: 'Updated memory' },
        expect.any(Object),
      ),
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Delete: Vegetarian. Peanuts are off the table, allergy.',
      }),
    );
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    const deleteButtons = alertSpy.mock.calls.at(-1)?.[2] ?? [];
    deleteButtons.find((button) => button.text === 'Delete')?.onPress?.();
    expect(mockDeleteMutate).toHaveBeenCalledWith('18e639d8-2454-4a94-8fd1-6c062729bf35');
  });

  it('keeps the design footer informational and offers labelled delete-all only in correction controls', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<NotebookScreen />);

    expect(screen.queryByRole('button', { name: 'Delete all notebook facts' })).toBeNull();
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Correct: Vegetarian. Peanuts are off the table, allergy.',
      }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Delete all notebook facts' }));
    expect(mockDeleteAllMutate).not.toHaveBeenCalled();
    const deleteButtons = alertSpy.mock.calls[0][2] ?? [];
    deleteButtons.find((button) => button.text === 'Delete all')?.onPress?.();
    expect(mockDeleteAllMutate).toHaveBeenCalledWith();
  });
});
