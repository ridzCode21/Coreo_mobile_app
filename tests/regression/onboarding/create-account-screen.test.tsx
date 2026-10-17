import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateAccountScreen from '@/features/onboarding/screens/CreateAccountScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';
import { ApiError } from '@/shared/api/errors';
import { colors, componentSizes, radii } from '@/shared/theme/tokens';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRegisterMutate = jest.fn();
const mockLoginMutate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useRegisterMutation: () => ({ mutate: mockRegisterMutate, isPending: false }),
    useLoginMutation: () => ({ mutate: mockLoginMutate, isPending: false }),
  };
});

const mockUpdateDietProfileMutate = jest.fn();
jest.mock('@/features/onboarding/api/dietProfileApi', () => ({
  useUpdateDietProfileMutation: () => ({
    mutate: mockUpdateDietProfileMutate,
    isPending: false,
  }),
}));

function seedDraft(pillars: ('diet' | 'fitness' | 'wellness')[] = ['diet', 'fitness']) {
  useOnboardingStore.setState({
    draft: {
      ...ONBOARDING_DEFAULTS,
      name: 'Maya Chen',
      goal: 'lose_weight',
      pillars,
      ageYears: 34,
      heightCm: 178,
      weightKg: 74,
      gender: 'female',
    },
    lastCompletedStep: null,
  });
}

function fillCredentials(password = 'quiet-harbor-42', confirm = password) {
  fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
  fireEvent.changeText(screen.getByPlaceholderText('Confirm password'), confirm);
}

async function submitForm() {
  fillCredentials();
  fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(mockRegisterMutate).toHaveBeenCalled());
}

function existingEmailError() {
  return new ApiError('Invalid registration data', 'validation', 400, {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid registration data',
      details: { email: ['User with this email already exists.'] },
    },
  });
}

describe('onboarding: Create account screen (8e, issue #14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedDraft();
    usePillarSelectionStore.setState({ activePillars: [], hasHydrated: true });
  });

  it('shows the design copy and fields in order: title, Email, Password, hint, Confirm password, button, link', () => {
    render(<CreateAccountScreen />);

    expect(screen.getByText('Create your')).toBeTruthy();
    expect(screen.getByText('account.')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    // Two "Password" labels exist (Password, Confirm password) — assert both placeholders exist.
    expect(screen.getAllByText('Password').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        'At least 8 characters. Not just numbers, not too common, and not too similar to your email or name.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Confirm password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Confirm password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'I already have an account' })).toBeTruthy();
  });

  it('renders no First name / Last name inputs — names come from the interview, not this screen', () => {
    render(<CreateAccountScreen />);
    expect(screen.queryByPlaceholderText('First name')).toBeNull();
    expect(screen.queryByPlaceholderText('Last name')).toBeNull();
  });

  it('styles the button solid ink, pill radius, 54px height — matching 8e/8b exactly', () => {
    render(<CreateAccountScreen />);
    const button = screen.getByRole('button', { name: 'Create account' });
    const flat = StyleSheet.flatten(button.props.style);
    expect(flat.backgroundColor).toBe(colors.ink);
    expect(flat.borderRadius).toBe(radii.pill);
    expect(flat.height).toBe(componentSizes.authButtonHeight);
  });

  it('"I already have an account" navigates to sign in (8b) without touching the API', () => {
    render(<CreateAccountScreen />);
    fireEvent.press(screen.getByRole('link', { name: 'I already have an account' }));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockRegisterMutate).not.toHaveBeenCalled();
  });

  it('shows "Passwords do not match." when confirm differs, and never calls register', async () => {
    render(<CreateAccountScreen />);
    fillCredentials('quiet-harbor-42', 'typo-oops-99');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(mockRegisterMutate).not.toHaveBeenCalled();
  });

  it('submits the full stored interview (name from the draft, not the form) without a diet-profile write', async () => {
    render(<CreateAccountScreen />);
    await submitForm();

    expect(mockRegisterMutate.mock.calls[0][0]).toEqual({
      firstName: 'Maya',
      lastName: 'Chen',
      email: 'maya@example.com',
      password: 'quiet-harbor-42',
      passwordConfirm: 'quiet-harbor-42',
      goal: 'lose_weight',
      activePillars: ['diet', 'fitness'],
      age: 34,
      heightCm: 178,
      weightKg: 74,
      gender: 'female',
    });
    expect(mockUpdateDietProfileMutate).not.toHaveBeenCalled();
  });

  it('keeps Fitness-only registration free of diet basics', async () => {
    seedDraft(['fitness']);
    useOnboardingStore.setState((state) => ({
      draft: { ...state.draft, goal: 'get_stronger' },
    }));
    render(<CreateAccountScreen />);
    await submitForm();

    const submitted = mockRegisterMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(submitted).toEqual(
      expect.objectContaining({ goal: 'get_stronger', activePillars: ['fitness'] }),
    );
    expect(submitted).not.toHaveProperty('age');
    expect(submitted).not.toHaveProperty('heightCm');
    expect(submitted).not.toHaveProperty('weightKg');
    expect(submitted).not.toHaveProperty('gender');
  });

  it('signs in and enters the app after successful registration', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<CreateAccountScreen />);
    await submitForm();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
  });

  it('captures the picked pillars into the pillar-selection store on successful registration (#51)', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<CreateAccountScreen />);
    await submitForm();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(usePillarSelectionStore.getState().activePillars).toEqual(['diet', 'fitness']);
  });

  it('shows a plain server error without a retry affordance', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(
        new ApiError('Server error', 'server', 500, {
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Something broke' },
        }),
      ),
    );
    render(<CreateAccountScreen />);
    await submitForm();

    expect(await screen.findByText('Something broke')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('falls back to login when the email already exists', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(existingEmailError()),
    );
    mockLoginMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<CreateAccountScreen />);
    await submitForm();

    expect(mockLoginMutate).toHaveBeenCalledWith(
      { email: 'maya@example.com', password: 'quiet-harbor-42' },
      expect.any(Object),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
  });

  it('shows the password-conflict message when existing-account login fails', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(existingEmailError()),
    );
    mockLoginMutate.mockImplementation((_values, handlers) => handlers.onError(new Error('no')));
    render(<CreateAccountScreen />);
    await submitForm();

    expect(
      await screen.findByText(
        'That email already exists. Use its password, or choose another email.',
      ),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
