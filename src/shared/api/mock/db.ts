/**
 * In-memory mock backend store — resets on every app reload/restart (fine for a mock; nothing
 * here is meant to be durable). Seeded and extended per-feature as real handlers are added (see
 * `features/<feature>/mocks`). Shapes should mirror the real objects in API_REFERENCE.md exactly
 * so swapping to the live API later is a no-op for feature code.
 */

import type { DietProfile } from '@/shared/types/dietProfile';
import type { Gender } from '@/shared/types/user';
import type { FoodEntry, FoodItem } from '@/shared/types/food';
import type { DailyLog } from '@/shared/types/dailyLog';
import type {
  AssistantIntent,
  MealPlanDetail,
  ReplacePreviewAlternative,
} from '@/shared/types/mealPlan';
import type { WeeklyDietReview } from '@/shared/types/weeklyDietReview';
import type { FitnessProfile } from '@/shared/types/fitnessProfile';
import type { WellnessProfile } from '@/shared/types/wellnessProfile';
import type { ChatReceipt } from '@/shared/types/chat';

export type MockChatTurn = {
  id: string;
  userId: string;
  message: string;
  status: 'proposed' | 'applied' | 'undone';
  receipts: ChatReceipt[];
  effects: {
    fitness?: { session_key: 'legs' | 'push' | 'pull'; from_date: string; to_date: string };
    dinner?: { plan_id: number; meal_id: number };
    wind_down?: { local_date: string; start: '9:30' };
  };
  before: { dinner?: { meal_id: number; name: string; rationale: string } } | null;
  createdAt: number;
  appliedAt: number | null;
};

export type MockUser = {
  id: string;
  email: string;
  /** Mock-only — never returned to the client, matches password storage semantics of the real API. */
  password: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  timezone: string;
  is_premium: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  calibration_started_on?: string | null;
  created_at: string;
  updated_at: string;
};

export type MockMemoryFact = {
  id: string;
  userId: string;
  text: string;
  source_label: string;
  stored_at: string;
  badge: string | null;
};

type MockDb = {
  users: MockUser[];
  passwordResetTokens: Record<
    string,
    { userId: string; email: string; expiresAt: number; used: boolean }
  >;
  /** Keyed by user id — one diet profile per user, seeded lazily on first GET/PUT (see
   * `features/onboarding/mocks/dietProfile.handlers.ts`). */
  dietProfiles: Record<string, DietProfile>;
  /** Keyed by user id — one fitness profile per user, seeded lazily on first GET/PUT. */
  fitnessProfiles: Record<string, FitnessProfile>;
  /** Keyed by user id — one wellness profile per user, seeded lazily on first GET/PUT. */
  wellnessProfiles: Record<string, WellnessProfile>;
  /** One training-loop anchor per user, mirroring TrainingBlock.started_on. */
  trainingBlocks: Record<string, { started_on: string }>;
  /** Completed sets, unique by user/date/exercise/set in the real backend. */
  completedSets: {
    userId: string;
    sessionDate: string;
    exerciseKey: string;
    setNumber: number;
  }[];
  /** All logged food entries (all users); handlers filter by the authed user + date. §8. */
  foodEntries: FoodEntry[];
  /** Recomputed daily aggregates, keyed `${userId}:${date}`. §10. */
  dailyLogs: Record<string, DailyLog>;
  /** Mock-only seam for today's latest workout-session avg_hr, keyed `${userId}:${date}`. */
  heartRateReadings: Record<string, number>;
  /** Stored Sunday reviews keyed by user id, matching WeeklyDietReview rows in the backend. */
  weeklyDietReviews: Record<string, WeeklyDietReview[]>;
  /** Seeded food database backing search + barcode lookup (see nutrition `mocks/fixtures.ts`). §8. */
  foodItems: FoodItem[];
  /** Custom-food ownership keyed by item id. Missing keys are shared catalog foods. */
  foodItemOwnerByItemId: Record<number, string>;
  /** AI-photo usage counter, keyed `${userId}:${date}`, enforcing the 10/day free limit. §8/§16. */
  photoQuotaByUserDate: Record<string, number>;
  /** Label-scan usage counter, keyed `${userId}:${date}`, independently enforcing 10/day. §8. */
  labelOcrQuotaByUserDate: Record<string, number>;
  /** Keyed `${userId}:${date}`. One plan per user per day (§12). */
  mealPlans: Record<string, MealPlanDetail>;
  /** GET poll counts for async meal-plan status progression. */
  mealPlanPollCounts: Record<string, number>;
  /** Preview tokens for the replace flow, TTL 600s (§13). */
  replacePreviews: Record<
    string,
    {
      userId: string;
      mealId: number;
      alternatives: ReplacePreviewAlternative[];
      expiresAt: number;
    }
  >;
  /** Per-action-per-user-per-day counters for §16 quotas. */
  quotaCounters: Record<string, number>;
  /** Recipes generated lazily so recipe quota only charges once per meal (§13). */
  generatedRecipeMealIds: Set<number>;
  /** Pending meal-assistant proposals, TTL 600s (§14). */
  assistantProposals: Record<
    string,
    {
      userId: string;
      date: string;
      intent: AssistantIntent;
      mealId?: number;
      expiresAt: number;
    }
  >;
  /** Cross-pillar proposals keyed by UUID, mirroring users.ChatTurn. */
  chatTurns: Record<string, MockChatTurn>;
  /** All notebook facts; handlers scope them to the authenticated caller. */
  memoryFacts: MockMemoryFact[];
  /** Monotonic id source for created food entries. */
  nextFoodEntryId: number;
  /** Monotonic id source for user-created food items. */
  nextFoodItemId: number;
  /** Monotonic id source for created meal plans. */
  nextMealPlanId: number;
  /** Monotonic id source for planned meals. */
  nextPlannedMealId: number;
  /** Monotonic id source for feedback entries. */
  nextMealFeedbackId: number;
};

function createEmptyDb(): MockDb {
  return {
    users: [],
    passwordResetTokens: {},
    dietProfiles: {},
    fitnessProfiles: {},
    wellnessProfiles: {},
    trainingBlocks: {},
    completedSets: [],
    foodEntries: [],
    dailyLogs: {},
    heartRateReadings: {},
    weeklyDietReviews: {},
    foodItems: [],
    foodItemOwnerByItemId: {},
    photoQuotaByUserDate: {},
    labelOcrQuotaByUserDate: {},
    mealPlans: {},
    mealPlanPollCounts: {},
    replacePreviews: {},
    quotaCounters: {},
    generatedRecipeMealIds: new Set<number>(),
    assistantProposals: {},
    chatTurns: {},
    memoryFacts: [],
    nextFoodEntryId: 1,
    nextFoodItemId: 11,
    nextMealPlanId: 1,
    nextPlannedMealId: 100,
    nextMealFeedbackId: 1,
  };
}

export const mockDb: MockDb = createEmptyDb();

/** Test-only / dev-tool escape hatch — wipes all mock data back to empty. */
export function __resetMockDbForTests(): void {
  mockDb.users = [];
  mockDb.passwordResetTokens = {};
  mockDb.dietProfiles = {};
  mockDb.fitnessProfiles = {};
  mockDb.wellnessProfiles = {};
  mockDb.trainingBlocks = {};
  mockDb.completedSets = [];
  mockDb.foodEntries = [];
  mockDb.dailyLogs = {};
  mockDb.heartRateReadings = {};
  mockDb.weeklyDietReviews = {};
  mockDb.foodItems = [];
  mockDb.foodItemOwnerByItemId = {};
  mockDb.photoQuotaByUserDate = {};
  mockDb.labelOcrQuotaByUserDate = {};
  mockDb.mealPlans = {};
  mockDb.mealPlanPollCounts = {};
  mockDb.replacePreviews = {};
  mockDb.quotaCounters = {};
  mockDb.generatedRecipeMealIds = new Set<number>();
  mockDb.assistantProposals = {};
  mockDb.chatTurns = {};
  mockDb.memoryFacts = [];
  mockDb.nextFoodEntryId = 1;
  mockDb.nextFoodItemId = 11;
  mockDb.nextMealPlanId = 1;
  mockDb.nextPlannedMealId = 100;
  mockDb.nextMealFeedbackId = 1;
}
