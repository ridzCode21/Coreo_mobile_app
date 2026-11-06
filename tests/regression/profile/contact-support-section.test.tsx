/**
 * Issue #179 — AccountScreen Contact us section (design "19d Account", design-spec 2845-2857, and
 * "19d · name / password / contact / alerts · states", 3057-3087). Follows the harness pattern from
 * `change-password-section.test.tsx`: the profile query and the name-update mutation are mocked so
 * this file can focus on the Contact us section alone; `useSendSupportMessageMutation` is mocked at
 * the hook boundary, not the network.
 *
 * The prior attempt at this issue failed its own RED/round checks four times on exactly this test:
 * "disables Send while the mutation is pending" could not find `getByRole('button', { name: 'Send'
 * })`. The fix, proven by the existing Password section
 * (`getByRole('button', { name: 'Save new password' })` stays queryable while its text shows
 * "Saving…"), is an explicit, stable `accessibilityLabel="Send"` that does not change with the
 * pending/idle text — only a genuine failure swaps the accessible name to "Try again" (plan.md
 * Decision log #2). Every disabled-state assertion below queries by that stable name, mirroring
 * `change-password-section.test.tsx` exactly; the visible "Sending…" text is asserted separately
 * via `testID="contact-support-send-button"`.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import AccountScreen from '@/features/profile/screens/AccountScreen';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('@/features/profile/api/accountApi', () => ({
  useExportDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountDataMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAccountMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/profile/api/passwordApi', () => ({
  useChangePasswordMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/profile/api/appConfigApi', () => ({
  useAppConfigQuery: () => ({
    data: {
      termsUrl: 'https://med_app.com/terms',
      privacyUrl: 'https://med_app.com/privacy',
    },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({
    data: {
      first_name: 'Shubham',
      last_name: '',
      email: 'shubham@example.com',
      timezone: 'America/New_York',
      created_at: '2026-03-02T00:00:00Z',
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useSessionStore: { getState: () => ({ signOut: jest.fn() }) },
}));

const mockSendMutate = jest.fn();
let mockSendState: { mutate: jest.Mock; isPending: boolean };

jest.mock('@/features/profile/api/contactSupportApi', () => ({
  useSendSupportMessageMutation: () => mockSendState,
}));

function fillContactForm({
  subject = 'Photo logging crashes',
  message = 'The camera button closes the app.',
}: { subject?: string; message?: string } = {}) {
  fireEvent.changeText(screen.getByLabelText('Subject'), subject);
  fireEvent.changeText(screen.getByLabelText('Message'), message);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendState = { mutate: mockSendMutate, isPending: false };
  act(() => {
    useConnectivityStore.setState({ isOnline: true, networkOnline: true, simulatedOffline: false });
  });
});

describe('profile: AccountScreen Contact us section layout (design-spec "19d Account" 2845-2857)', () => {
  it('shows the Contact us eyebrow, Subject and Message fields, and the Send button in order', () => {
    render(<AccountScreen />);
    const section = screen.getByTestId('account-contact-support-section');
    expect(within(section).getByText('Contact us')).toBeTruthy();
    expect(within(section).getByLabelText('Subject')).toBeTruthy();
    expect(within(section).getByLabelText('Message')).toBeTruthy();
    expect(within(section).getByRole('button', { name: 'Send' })).toBeTruthy();
  });

  it('uses the design placeholders for Subject and Message', () => {
    render(<AccountScreen />);
    expect(screen.getByLabelText('Subject').props.placeholder).toBe("What's on your mind");
    expect(screen.getByLabelText('Message').props.placeholder).toBe(
      "Write to us and we'll write back.",
    );
  });
});

describe('profile: AccountScreen Contact us submit contract', () => {
  it('sends exactly { subject, message } to the mutation', async () => {
    render(<AccountScreen />);
    fillContactForm({ subject: 'Photo logging crashes', message: 'The camera button closes.' });
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(mockSendMutate).toHaveBeenCalledWith(
        { subject: 'Photo logging crashes', message: 'The camera button closes.' },
        expect.anything(),
      ),
    );
  });
});

describe('profile: AccountScreen Contact us validation (issue: empty fields blocked)', () => {
  it('blocks an empty subject with a clear message and never calls the mutation', async () => {
    render(<AccountScreen />);
    fillContactForm({ subject: '', message: 'Something is wrong.' });
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Subject is required.')).toBeTruthy());
    expect(mockSendMutate).not.toHaveBeenCalled();
  });

  it('blocks an empty message with a clear message and never calls the mutation', async () => {
    render(<AccountScreen />);
    fillContactForm({ subject: 'Bug report', message: '' });
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Message is required.')).toBeTruthy());
    expect(mockSendMutate).not.toHaveBeenCalled();
  });
});

describe('profile: AccountScreen Contact us disabled states (issue: disable sending while offline)', () => {
  it('disables Send while the mutation is pending, keeping the accessible name "Send"', () => {
    mockSendState = { mutate: mockSendMutate, isPending: true };
    render(<AccountScreen />);
    const button = screen.getByRole('button', { name: 'Send' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(within(button).getByText('Sending…')).toBeTruthy();
  });

  it('disables Send while offline', () => {
    act(() => {
      useConnectivityStore.setState({
        isOnline: false,
        networkOnline: false,
        simulatedOffline: true,
      });
    });
    render(<AccountScreen />);
    expect(screen.getByRole('button', { name: 'Send' }).props.accessibilityState?.disabled).toBe(
      true,
    );
  });

  it('does not disable Send when online and idle', () => {
    render(<AccountScreen />);
    expect(
      screen.getByRole('button', { name: 'Send' }).props.accessibilityState?.disabled,
    ).toBeFalsy();
  });
});

describe('profile: AccountScreen Contact us Sending/Sent/Failed states (design 3057-3087)', () => {
  it('shows "Thanks, we\'ll write back." and clears the fields on success', async () => {
    mockSendMutate.mockImplementation((_values, options) => {
      options?.onSuccess?.({
        success: true,
        data: {
          support_request: { id: 'SR-1', subject: 'x', category: 'support', submitted_at: 'now' },
        },
        message: 'Support request submitted successfully.',
      });
    });
    render(<AccountScreen />);
    fillContactForm();
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText("Thanks, we'll write back.")).toBeTruthy());
    expect(screen.getByLabelText('Subject').props.value).toBe('');
    expect(screen.getByLabelText('Message').props.value).toBe('');
  });

  it('shows the failed message, swaps the button to "Try again", and keeps what the user typed', async () => {
    mockSendMutate.mockImplementation((_values, options) => {
      options?.onError?.(new Error('network down'));
    });
    render(<AccountScreen />);
    fillContactForm({ subject: 'Photo logging crashes', message: 'The camera button closes.' });
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Your message wasn't sent.")).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByLabelText('Subject').props.value).toBe('Photo logging crashes');
    expect(screen.getByLabelText('Message').props.value).toBe('The camera button closes.');
  });

  it('resubmits the same values when Try again is pressed', async () => {
    mockSendMutate.mockImplementationOnce((_values, options) => {
      options?.onError?.(new Error('network down'));
    });
    render(<AccountScreen />);
    fillContactForm({ subject: 'Photo logging crashes', message: 'The camera button closes.' });
    fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy());

    mockSendMutate.mockImplementationOnce(() => {});
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(mockSendMutate).toHaveBeenLastCalledWith(
        { subject: 'Photo logging crashes', message: 'The camera button closes.' },
        expect.anything(),
      ),
    );
  });
});
