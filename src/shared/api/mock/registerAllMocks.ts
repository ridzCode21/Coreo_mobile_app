/**
 * Side-effect import point: every feature's mock handler module registers its routes at import
 * time via `registerMock()` (`shared/api/mock/router.ts`). Importing this one module from
 * `shared/api/transport/index.ts` guarantees every feature's handlers are registered before any
 * request can be dispatched, without each feature needing its own wiring into the transport layer
 * — see docs/implementation-plan.md §2. Add each new feature's `mocks/handlers.ts` here as it's
 * built.
 */
import '@/features/auth/mocks/handlers';
import '@/features/home/mocks/sources.handlers';
import '@/features/fitness/mocks/fitnessProfile.handlers';
import '@/features/fitness/mocks/trainingWeek.handlers';
import '@/features/wellness/mocks/wellnessProfile.handlers';
import '@/features/wellness/mocks/windDown.handlers';
import '@/features/wellness/mocks/rightNow.handlers';
import '@/features/onboarding/mocks/dietProfile.handlers';
import '@/features/nutrition/mocks/handlers';
import '@/features/nutrition/mocks/mealPlan.handlers';
import '@/features/chat/mocks/chat.handlers';
import '@/features/profile/mocks/account.handlers';
import '@/features/patterns/mocks/insights.handlers';
