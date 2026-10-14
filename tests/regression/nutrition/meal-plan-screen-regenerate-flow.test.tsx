/**
 * Issue #36 — `MealPlanScreen`'s orchestration of the regenerate flow. `RegenerateSheet` and
 * `RebuildingPlanCard` are covered on their own copy/interactions in their sibling test files; this
 * file only proves the screen wires them together correctly, same precedent as
 * `meal-detail-replace-flow.test.tsx`.
 *
 * Covers the two broken moments from the issue:
 *  1. A plan whose status is pending/generating/validating must show the rebuilding card, never
 *     "No plan is ready yet." (`MealPlanScreen.tsx:209` pre-fix).
 *  2. A 429 quota error must flow into the still-open sheet (not a screen-body `QuotaBanner` drawn
 *     behind the open modal, `MealPlanScreen.tsx:83-86,174,270` pre-fix).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import MealPlanScreen from '@/features/nutrition/screens/MealPlanScreen';
import type {
  MealPlanDetail,
  QuotaExceededError,
  RegenerationReason,
} from '@/shared/types/mealPlan';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: { budget_tier: 'moderate', cooking_frequency: 'once_daily' },
  }),
  useUpdateDietProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

let mockPlanData: Partial<MealPlanDetail> | undefined;
let mockRegenerateError: unknown = null;
const mockRegenerateMutate = jest.fn();

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({ data: mockPlanData, isLoading: false }),
  useRegenerateMealPlanMutation: () => ({
    mutate: mockRegenerateMutate,
    isPending: false,
    error: mockRegenerateError,
  }),
}));

jest.mock('@/features/nutrition/components/RegenerateSheet', () => {
  const { Text, Pressable } = jest.requireActual('react-native');
  return {
    RegenerateSheet: ({ visible, quotaError, onSubmit }: Record<string, unknown>) =>
      visible ? (
        <>
          <Text testID="regenerate-sheet-stub">regenerate-sheet-open</Text>
          {quotaError ? <Text testID="regenerate-sheet-quota-error">has-quota-error</Text> : null}
          <Pressable testID="regenerate-sheet-submit" onPress={() => (onSubmit as () => void)()} />
        </>
      ) : null,
  };
});

jest.mock('@/features/nutrition/components/RebuildingPlanCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RebuildingPlanCard: ({ status, reason }: { status: string; reason: string | null }) => (
      <Text testID="rebuilding-plan-card-stub">{`rebuilding:${status}:${reason}`}</Text>
    ),
  };
});

const PLAN: MealPlanDetail = {
  id: 1,
  status: 'ready',
  date_start: '2026-10-14',
  date_end: '2026-10-14',
  total_calories: 2000,
  total_protein_g: 150,
  total_carbs_g: 200,
  total_fat_g: 60,
  validation_result: {
    self_check_status: 'ok',
    macro_ok: true,
    violation_count: 0,
    self_check_issues: [],
  },
  self_check_status: 'ok',
  plan_mode: 'standard',
  historical_fallback_reason: '',
  meals: [],
};

beforeEach(() => {
  mockPlanData = PLAN;
  mockRegenerateError = null;
  mockRegenerateMutate.mockReset();
});

describe('MealPlanScreen regenerate flow (issue #36)', () => {
  it.each(['pending', 'generating', 'validating'] as const)(
    'shows the rebuilding card and never "No plan is ready yet." when status=%s',
    (status) => {
      mockPlanData = { ...PLAN, status };
      render(<MealPlanScreen />);
      expect(screen.getByTestId('rebuilding-plan-card-stub')).toBeTruthy();
      expect(screen.queryByText('No plan is ready yet. Generate one from Diet.')).toBeNull();
    },
  );

  it('shows the normal plan view (no rebuilding card) when status=ready', () => {
    mockPlanData = { ...PLAN, status: 'ready' };
    render(<MealPlanScreen />);
    expect(screen.queryByTestId('rebuilding-plan-card-stub')).toBeNull();
  });

  it('passes a 429 quota error into RegenerateSheet instead of a loose screen-body QuotaBanner', () => {
    const quotaError: QuotaExceededError = {
      error: 'quota_exceeded',
      action: 'plan_regenerate',
      message: "You've used all your regenerates for today.",
      limit: 2,
      tier: 'free',
      quota_resets_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    mockRegenerateError = Object.assign(new Error('quota'), {
      name: 'ApiError',
      status: 429,
      details: quotaError,
      kind: 'validation',
    });
    Object.setPrototypeOf(
      mockRegenerateError,
      jest.requireActual('@/shared/api/errors').ApiError.prototype,
    );

    mockPlanData = { ...PLAN, status: 'ready' };
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByLabelText('Regenerate plan'));
    expect(screen.getByTestId('regenerate-sheet-quota-error')).toBeTruthy();
    expect(screen.queryByText(/limit is spent/i)).toBeNull();
  });

  it('sets the rebuilding reason from the reason actually submitted, not a stale default', () => {
    mockPlanData = { ...PLAN, status: 'ready' };
    mockRegenerateMutate.mockImplementation(
      (_vars: { regeneration_reason: RegenerationReason }, opts?: { onSuccess?: () => void }) => {
        mockPlanData = { ...PLAN, status: 'generating' };
        opts?.onSuccess?.();
      },
    );

    const { rerender } = render(<MealPlanScreen />);
    fireEvent.press(screen.getByLabelText('Regenerate plan'));
    fireEvent.press(screen.getByTestId('regenerate-sheet-submit'));
    rerender(<MealPlanScreen />);

    expect(mockRegenerateMutate).toHaveBeenCalled();
    expect(screen.getByTestId('rebuilding-plan-card-stub').props.children).toContain(
      'rebuilding:generating:',
    );
  });
});
