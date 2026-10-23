import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SaveScreen from '@/features/onboarding/screens/SaveScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';
import {
  GoogleSignInCancelledError,
  GoogleSignInNetworkError,
  GoogleSignInUnavailableError,
} from '@/features/auth/lib/googleIdentity';
import { ApiError } from '@/shared/api/errors';

const mockReplace = jest.fn();
const mockGoogleMutate = jest.fn();
const mockGetGoogleIdentityToken = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/auth/api/authApi', () => {
  const actual = jest.requireActual('@/features/auth/api/authApi');
  return {
    ...actual,
    useGoogleSignInMutation: () => ({ mutate: mockGoogleMutate, isPending: false }),
  };
});

jest.mock('@/features/auth/lib/googleIdentity', () => {
  const actual = jest.requireActual('@/features/auth/lib/googleIdentity');
  return {
    ...actual,
    getGoogleIdentityToken: (...args: unknown[]) => mockGetGoogleIdentityToken(...args),
  };
});

const mockUpdateDietProfileMutate = jest.fn();
jest.mock('@/features/onboarding/api/dietProfileApi', () => ({
  useUpdateDietProfileMutation: () => ({
    mutate: mockUpdateDietProfileMutate,
    isPending: false,
  }),
}));

/**
 * Issue #13 — "Continue with Google" used to fake an account via `/users/register/` with a
 * generated `@mock.coreo.app` email (the bug). It now fetches a device identity token
 * (`getGoogleIdentityToken`) and posts it plus the stored interview to the real
 * `POST /users/google/` (apps/users/urls.py:28). Replaces the old
 * `save-screen-registration.test.tsx` (#12), which asserted the fake-register payload.
 */
describe('onboarding: Save your core calls the real Google endpoint (issue #13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGoogleIdentityToken.mockResolvedValue({
      identityToken: 'mockgoogle:stand-in-token',
      firstName: 'Maya',
      lastName: 'Chen',
    });
    useOnboardingStore.setState({
      draft: {
        ...ONBOARDING_DEFAULTS,
        name: 'Maya Chen',
        goal: 'lose_weight',
        pillars: ['diet', 'fitness', 'wellness'],
        ageYears: 34,
        heightCm: 178,
        weightKg: 74,
        gender: 'female',
      },
      lastCompletedStep: null,
    });
    usePillarSelectionStore.setState({ activePillars: [], hasHydrated: true });
  });

  it('fetches a device identity token and sends it with the interview to POST /users/google/', async () => {
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockGoogleMutate).toHaveBeenCalled());
    expect(mockGetGoogleIdentityToken).toHaveBeenCalledWith('Maya Chen');
    const [submitted] = mockGoogleMutate.mock.calls[0] as [Record<string, unknown>];
    expect(submitted).toEqual(
      expect.objectContaining({
        identityToken: 'mockgoogle:stand-in-token',
        firstName: 'Maya',
        lastName: 'Chen',
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

  it('signs in and goes to the Arrival screen when Google sign-in succeeds (#16)', async () => {
    mockGoogleMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/onboarding/arrival'));
    expect(mockUpdateDietProfileMutate).not.toHaveBeenCalled();
  });

  it('captures the picked pillars into the pillar-selection store on successful sign-in (#51)', async () => {
    mockGoogleMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/onboarding/arrival'));
    expect(usePillarSelectionStore.getState().activePillars).toEqual([
      'diet',
      'fitness',
      'wellness',
    ]);
  });

  it('keeps the draft (name, pillars) intact on arrival instead of resetting it early (#16)', async () => {
    mockGoogleMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/onboarding/arrival'));
    expect(useOnboardingStore.getState().draft.name).toBe('Maya Chen');
    expect(useOnboardingStore.getState().draft.pillars).toEqual(['diet', 'fitness', 'wellness']);
  });

  it('shows a banner and does not retry a login when the Google email already has an account', async () => {
    mockGoogleMutate.mockImplementation((_values, handlers) =>
      handlers.onError(
        new ApiError('That request could not be validated.', 'validation', 400, {
          error: {
            code: 'VALIDATION_ERROR',
            details: { email: ['User with this email already exists.'] },
          },
        }),
      ),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() =>
      expect(
        screen.getByText('That Google email already has an account. Use email instead to sign in.'),
      ).toBeTruthy(),
    );
  });

  it('shows a banner and never calls the mutation when no on-device Google identity is available', async () => {
    mockGetGoogleIdentityToken.mockRejectedValue(new GoogleSignInUnavailableError());
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() =>
      expect(
        screen.getByText("Google sign-in isn't available right now. Use email instead."),
      ).toBeTruthy(),
    );
    expect(mockGoogleMutate).not.toHaveBeenCalled();
  });

  it('stays quiet and does not call the mutation when the person cancels Google', async () => {
    mockGetGoogleIdentityToken.mockRejectedValue(new GoogleSignInCancelledError());
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockGetGoogleIdentityToken).toHaveBeenCalled());
    expect(screen.queryByText(/Couldn't reach Google|isn't available/)).toBeNull();
    expect(mockGoogleMutate).not.toHaveBeenCalled();
  });

  it('shows a plain message when Google cannot be reached', async () => {
    mockGetGoogleIdentityToken.mockRejectedValue(new GoogleSignInNetworkError());
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Couldn't reach Google. Check your connection and try again, or use email.",
        ),
      ).toBeTruthy(),
    );
    expect(mockGoogleMutate).not.toHaveBeenCalled();
  });
});
