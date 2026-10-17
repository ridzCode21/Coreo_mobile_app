import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import SaveScreen from '@/features/onboarding/screens/SaveScreen';
import {
  ONBOARDING_DEFAULTS,
  useOnboardingStore,
} from '@/features/onboarding/store/onboardingStore';
import { usePillarSelectionStore } from '@/features/auth/store/pillarSelectionStore';

const mockReplace = jest.fn();
const mockRegisterMutate = jest.fn();
const mockLoginMutate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
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

describe('onboarding: Save your core social registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('carries the stored interview into the Google registration call', () => {
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    const [submitted] = mockRegisterMutate.mock.calls[0] as [Record<string, unknown>];
    expect(submitted).toEqual(
      expect.objectContaining({
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

  it('signs in and returns to the app when Google registration succeeds', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(mockUpdateDietProfileMutate).not.toHaveBeenCalled();
  });

  it('captures the picked pillars into the pillar-selection store on successful registration (#51)', async () => {
    mockRegisterMutate.mockImplementation((_values, handlers) =>
      handlers.onSuccess({ data: { tokens: { access: 'a', refresh: 'r' } } }),
    );
    render(<SaveScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(app)'));
    expect(usePillarSelectionStore.getState().activePillars).toEqual([
      'diet',
      'fitness',
      'wellness',
    ]);
  });
});
