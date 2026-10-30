/**
 * Issue #31 — `MealPlanScreen` ("Today's plan" at `/diet/plan`) rebuilt into design screens 28a
 * (no plan), 28b (building, first-generate), and 28d (couldn't build), plus the explicit fix
 * "show 28a only on a 404, not for every error" (design-spec.md, design lines 3186-3349).
 *
 * 28c (ready) and the relocated `FullMealPlanScreen` have their own test files. `RebuildingPlanCard`
 * (issue #36's regenerate-with-reason flow) is untouched and keeps its own tests — this file only
 * proves `MealPlanScreen` renders the *first-build* checklist copy (`reason` always `null` here),
 * never #36's "Rebuilding your plan…" copy.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import MealPlanScreen from '@/features/nutrition/screens/MealPlanScreen';
import { ApiError } from '@/shared/api/errors';
import type { MealPlanDetail, MealPlanStatus } from '@/shared/types/mealPlan';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({
    data: {
      daily_calories: 2000,
      daily_protein_g: 150,
      daily_carbs_g: 220,
      daily_fat_g: 60,
    },
  }),
  useUpdateDietProfileMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/nutrition/api/nutritionApi', () => ({
  todayISO: () => '2026-10-16',
  useFoodEntriesQuery: () => ({
    data: {
      entries: [],
      macro_summary: {
        calories: { consumed: 0, target: 2000, remaining: 2000, over: false },
        protein_g: { consumed: 0, target: 150, remaining: 150, over: false },
        carbs_g: { consumed: 0, target: 220, remaining: 220, over: false },
        fat_g: { consumed: 0, target: 60, remaining: 60, over: false },
      },
    },
    isLoading: false,
    isError: false,
  }),
}));

function apiError(status: number, details?: unknown): ApiError {
  const error = Object.assign(new Error('mock api error'), {
    name: 'ApiError',
    status,
    details,
    kind: 'validation',
  });
  Object.setPrototypeOf(error, ApiError.prototype);
  return error as ApiError;
}

let mockPlanData: Partial<MealPlanDetail> | undefined;
let mockPlanError: unknown = null;
const mockCreateMutate = jest.fn();
const mockRegenerateMutate = jest.fn();
let mockCreateError: unknown = null;

jest.mock('@/features/nutrition/api/mealPlanApi', () => ({
  useMealPlanQuery: () => ({
    data: mockPlanData,
    isLoading: false,
    isError: Boolean(mockPlanError),
    error: mockPlanError,
  }),
  useCreateMealPlanMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: mockCreateError,
  }),
  useRegenerateMealPlanMutation: () => ({
    mutate: mockRegenerateMutate,
    isPending: false,
    error: null,
  }),
  useAssistantPromptsQuery: () => ({ data: { options: [] } }),
}));

function planWithStatus(status: MealPlanStatus): MealPlanDetail {
  return {
    id: 1,
    status,
    failure_reason: '',
    date_start: '2026-10-16',
    date_end: '2026-10-16',
    total_calories: 2000,
    total_protein_g: 150,
    total_carbs_g: 220,
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
}

beforeEach(() => {
  mockPlanData = undefined;
  mockPlanError = null;
  mockCreateError = null;
  mockCreateMutate.mockReset();
  mockRegenerateMutate.mockReset();
  mockPush.mockReset();
});

describe('MealPlanScreen · 28a no plan yet (issue #31)', () => {
  beforeEach(() => {
    mockPlanData = undefined;
    mockPlanError = apiError(404, { error: 'plan_not_found' });
  });

  it('shows the exact design copy', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText("Let's build today's plate.")).toBeTruthy();
    expect(screen.getByText('One tap, and I fit it to you.')).toBeTruthy();
    expect(screen.getByText("Generate today's plan")).toBeTruthy();
  });

  it('never shows an invented quota line or day pill', () => {
    render(<MealPlanScreen />);
    expect(screen.queryByText(/plans today/i)).toBeNull();
    expect(screen.queryByText(/Day 6/i)).toBeNull();
  });

  it('tapping Generate calls create directly, with no cuisine prompt', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByLabelText("Generate today's plan"));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('What flavours feel like home today?')).toBeNull();
  });

  it('shows the real plan-generate quota line when the backend 404 includes usage (issue #138)', () => {
    mockPlanError = apiError(404, {
      error: 'plan_not_found',
      quota: {
        tier: 'free',
        quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
        plan_generate: { limit: 2, used: 0, remaining: 2 },
        plan_regenerate: { limit: 2, used: 0, remaining: 2 },
      },
    });
    render(<MealPlanScreen />);
    expect(screen.getByText('Uses 1 of 2 plans today · 1 left after this')).toBeTruthy();
  });

  it('shows zero left after this on the last available generate today (issue #138)', () => {
    mockPlanError = apiError(404, {
      error: 'plan_not_found',
      quota: {
        tier: 'free',
        quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
        plan_generate: { limit: 2, used: 1, remaining: 1 },
        plan_regenerate: { limit: 2, used: 0, remaining: 2 },
      },
    });
    render(<MealPlanScreen />);
    expect(screen.getByText('Uses 2 of 2 plans today · 0 left after this')).toBeTruthy();
  });

  it('hides the quota line once the daily generate limit is already spent (issue #138)', () => {
    mockPlanError = apiError(404, {
      error: 'plan_not_found',
      quota: {
        tier: 'free',
        quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
        plan_generate: { limit: 2, used: 2, remaining: 0 },
        plan_regenerate: { limit: 2, used: 0, remaining: 2 },
      },
    });
    render(<MealPlanScreen />);
    expect(screen.queryByText(/plans today/i)).toBeNull();
  });

  it('shows the quota banner when create hits the daily limit', () => {
    mockCreateError = apiError(429, {
      error: 'quota_exceeded',
      action: 'plan_generate',
      message: 'You have reached your daily plan generation limit.',
      limit: 2,
      tier: 'free',
      quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    render(<MealPlanScreen />);
    expect(screen.getByText(/today.*limit is spent/i)).toBeTruthy();
  });
});

describe('MealPlanScreen · non-404 errors never show the 28a copy (issue #31)', () => {
  it('a 500 (or any non-404) error shows a generic retry message, not "Let\'s build today\'s plate."', () => {
    mockPlanData = undefined;
    mockPlanError = apiError(500, { error: 'server_error' });
    render(<MealPlanScreen />);
    expect(screen.queryByText("Let's build today's plate.")).toBeNull();
    expect(screen.queryByText("Generate today's plan")).toBeNull();
  });

  it('a network error (no status) also does not show the 28a copy', () => {
    mockPlanData = undefined;
    mockPlanError = new Error('network down');
    render(<MealPlanScreen />);
    expect(screen.queryByText("Let's build today's plate.")).toBeNull();
  });
});

describe('MealPlanScreen · 28b building, first generate (issue #31)', () => {
  it.each(['pending', 'generating', 'validating'] as const)(
    "shows the first-build checklist copy for status=%s, never #36's regenerate copy",
    (status) => {
      mockPlanData = planWithStatus(status);
      render(<MealPlanScreen />);
      expect(screen.getByText(/Building today's plate/)).toBeTruthy();
      expect(screen.getByText('Give me a few seconds. I check the math twice.')).toBeTruthy();
      expect(screen.getByText('Reading your usuals')).toBeTruthy();
      expect(screen.getByText('Balancing your macros')).toBeTruthy();
      expect(screen.getByText('Double-checking it adds up')).toBeTruthy();
      expect(screen.getByText("This won't count against today until it's ready.")).toBeTruthy();
      expect(screen.queryByText('Rebuilding your plan…')).toBeNull();
      expect(screen.queryByText(/Fitting it to/)).toBeNull();
    },
  );

  it('marks step 0 active and steps 1-2 not started when status=pending', () => {
    mockPlanData = planWithStatus('pending');
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-build-step-0-active')).toBeTruthy();
    expect(screen.queryByTestId('plan-build-step-1-active')).toBeNull();
    expect(screen.queryByTestId('plan-build-step-1-done')).toBeNull();
  });

  it('marks step 0 done and step 1 active when status=generating', () => {
    mockPlanData = planWithStatus('generating');
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-build-step-0-done')).toBeTruthy();
    expect(screen.getByTestId('plan-build-step-1-active')).toBeTruthy();
  });

  it('marks steps 0-1 done and step 2 active when status=validating', () => {
    mockPlanData = planWithStatus('validating');
    render(<MealPlanScreen />);
    expect(screen.getByTestId('plan-build-step-0-done')).toBeTruthy();
    expect(screen.getByTestId('plan-build-step-1-done')).toBeTruthy();
    expect(screen.getByTestId('plan-build-step-2-active')).toBeTruthy();
  });
});

describe("MealPlanScreen · 28d couldn't build (issue #31)", () => {
  beforeEach(() => {
    mockPlanData = planWithStatus('failed');
  });

  it('shows the exact design copy and no backend jargon', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText("Couldn't build today's plate.")).toBeTruthy();
    expect(
      screen.getByText("Nothing logged, nothing lost. Let's just try that again."),
    ).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Or log meals yourself for now')).toBeTruthy();
    expect(screen.queryByText(/backend/i)).toBeNull();
  });

  it('"Try again" calls create, never regenerate with a made-up reason', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByText('Try again'));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockRegenerateMutate).not.toHaveBeenCalled();
  });

  it('"Or log meals yourself for now" navigates to Diet home', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByText('Or log meals yourself for now'));
    expect(mockPush).toHaveBeenCalledWith('/diet');
  });

  it('shows the quota banner when a retry hits the daily limit', () => {
    mockCreateError = apiError(429, {
      error: 'quota_exceeded',
      action: 'plan_generate',
      message: 'You have reached your daily plan generation limit.',
      limit: 2,
      tier: 'free',
      quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    render(<MealPlanScreen />);
    expect(screen.getByText(/today.*limit is spent/i)).toBeTruthy();
  });

  it("never shows 33b's plan-check-failed copy when the plan never got built", () => {
    render(<MealPlanScreen />);
    expect(screen.queryByText("This one didn't quite balance.")).toBeNull();
    expect(screen.queryByText('Rebuild the plan')).toBeNull();
    expect(screen.queryByText('Or adjust it myself')).toBeNull();
  });
});

describe("MealPlanScreen · 33b plan check didn't pass (issue #37)", () => {
  beforeEach(() => {
    mockPlanData = { ...planWithStatus('failed'), failure_reason: 'plan_check_failed' };
  });

  it('shows the exact design copy and no backend jargon', () => {
    render(<MealPlanScreen />);
    expect(screen.getByText("This one didn't quite balance.")).toBeTruthy();
    expect(
      screen.getByText('A couple of things clashed with your goals. Nothing logged, nothing lost.'),
    ).toBeTruthy();
    expect(screen.getByText('Rebuild the plan')).toBeTruthy();
    expect(screen.getByText('Or adjust it myself')).toBeTruthy();
    expect(screen.queryByText(/self.check/i)).toBeNull();
    expect(screen.queryByText(/plan_check_failed/i)).toBeNull();
    expect(screen.queryByText(/validation_result/i)).toBeNull();
    expect(screen.queryByText(/backend/i)).toBeNull();
  });

  it('never shows 28d\'s "couldn\'t build" copy instead', () => {
    render(<MealPlanScreen />);
    expect(screen.queryByText("Couldn't build today's plate.")).toBeNull();
    expect(
      screen.queryByText("Nothing logged, nothing lost. Let's just try that again."),
    ).toBeNull();
    expect(screen.queryByText('Try again')).toBeNull();
    expect(screen.queryByText('Or log meals yourself for now')).toBeNull();
  });

  it('"Rebuild the plan" calls create, never regenerate with a made-up reason', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByText('Rebuild the plan'));
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateMutate).toHaveBeenCalledWith();
    expect(mockRegenerateMutate).not.toHaveBeenCalled();
  });

  it('"Or adjust it myself" navigates to Diet home', () => {
    render(<MealPlanScreen />);
    fireEvent.press(screen.getByText('Or adjust it myself'));
    expect(mockPush).toHaveBeenCalledWith('/diet');
  });

  it('shows the quota banner when a rebuild hits the daily limit', () => {
    mockCreateError = apiError(429, {
      error: 'quota_exceeded',
      action: 'plan_generate',
      message: 'You have reached your daily plan generation limit.',
      limit: 2,
      tier: 'free',
      quota_resets_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    render(<MealPlanScreen />);
    expect(screen.getByText(/today.*limit is spent/i)).toBeTruthy();
  });
});
