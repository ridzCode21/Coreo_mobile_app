import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CreateAccountScreen from '@/features/onboarding/screens/CreateAccountScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';
import { ApiError } from '@/shared/api/errors';

const mockReplace = jest.fn();
const mockRegisterMutate = jest.fn();
const mockLoginMutate = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

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

async function submitForm() {
  fireEvent.changeText(screen.getByPlaceholderText('Email'), 'maya@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'quiet-harbor-42');
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

describe('onboarding: Create account screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedDraft();
  });

  it('shows the four account fields and Create account button', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByPlaceholderText('First name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Last name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('submits the full stored interview without a diet-profile write', async () => {
    render(<CreateAccountScreen />);
    await submitForm();

    expect(mockRegisterMutate.mock.calls[0][0]).toEqual({
      firstName: 'Maya',
      lastName: 'Chen',
      email: 'maya@example.com',
      password: 'quiet-harbor-42',
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
