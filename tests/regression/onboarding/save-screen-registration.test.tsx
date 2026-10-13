/**
 * Issue #8 — "Save your core" sent only email/password/name to `POST /users/register/`, then made
 * a second `PUT /users/me/diet-profile/` write that the real API never needs (API_REFERENCE.md §3:
 * "No guest session and no follow-up diet-profile write are required."). That second call is also
 * why the "account saved, plan not saved — Retry" state existed
 * (`src/features/onboarding/screens/SaveScreen.tsx:173,379-388` pre-fix). This protects: the full
 * interview (goal, pillars, age/height/weight/gender) reaching the register call exactly as the
 * backend requires, that no diet-profile mutation fires at all, and that a failed register shows a
 * plain error with no retry affordance.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import SaveScreen from '@/features/onboarding/screens/SaveScreen';
import {
  useOnboardingStore,
  ONBOARDING_DEFAULTS,
} from '@/features/onboarding/store/onboardingStore';
import { ApiError } from '@/shared/api/errors';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

const mockReplace = jest.fn();
const mockRegisterMutate = jest.fn();
const mockLoginMutate = jest.fn();

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

function seedDraft() {
  useOnboardingStore.setState({
    draft: {
      ...ONBOARDING_DEFAULTS,
      name: 'Maya',
      goal: 'lose_weight',
      pillars: ['diet', 'fitness', 'wellness'],
      ageYears: 34,
      heightCm: 178,
      weightKg: 74,
      gender: 'female',
    },
    lastCompletedStep: null,
  });
}

async function submitEmailForm() {
  fireEvent.press(screen.getByRole('button', { name: 'Use email instead' }));
  fireEvent.changeText(screen.getByPlaceholderText('Email'), 'maya@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'quiet-harbor-42');
  fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(mockRegisterMutate).toHaveBeenCalled());
}

describe('onboarding: Save your core registration (issue #8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedDraft();
  });

  it('submits the stored interview and never calls the diet-profile mutation', async () => {
    render(<SaveScreen />);

    await submitEmailForm();

    const [submitted] = mockRegisterMutate.mock.calls[0] as [Record<string, unknown>];
    expect(submitted).toEqual(
      expect.objectContaining({
        goal: 'lose_weight',
        activePillars: ['diet', 'fitness', 'wellness'],
        age: 34,
        heightCm: 178,
        weightKg: 74,
        gender: 'female',
      }),
    );
    expect(mockUpdateDietProfileMutate).not.toHaveBeenCalled();
  });

  it('omits the diet basics from the register call for a Fitness-only interview', async () => {
    useOnboardingStore.setState((state) => ({
      draft: { ...state.draft, pillars: ['fitness'], goal: 'get_stronger' },
    }));
    render(<SaveScreen />);

    await submitEmailForm();

    const [submitted] = mockRegisterMutate.mock.calls[0] as [Record<string, unknown>];
    expect(submitted).toEqual(
      expect.objectContaining({ goal: 'get_stronger', activePillars: ['fitness'] }),
    );
  });

  it('signs in and returns to the app on a successful register, with no diet-profile retry step', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    await submitEmailForm();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(mockUpdateDietProfileMutate).not.toHaveBeenCalled();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows a plain error on a failed register, with no "plan not saved" retry banner', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onError(
        new ApiError('Something went wrong on our side.', 'server', 500, {
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Something broke' },
        }),
      ),
    );
    render(<SaveScreen />);

    await submitEmailForm();

    await waitFor(() => expect(screen.getByText('Something broke')).toBeTruthy());
    expect(screen.queryByText('Retry')).toBeNull();
    expect(screen.queryByText(/plan not saved/i)).toBeNull();
  });
});
