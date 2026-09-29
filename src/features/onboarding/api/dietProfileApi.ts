import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import type { DietProfile, DietProfilePatch } from '@/shared/types/dietProfile';

/** Query-key factory for the diet profile — one query per signed-in user, no params today. */
export const dietProfileKeys = {
  all: ['dietProfile'] as const,
};

/**
 * `GET /users/me/diet-profile/` (bare payload, API_REFERENCE.md §5). The onboarding interview
 * itself no longer reads this — v2 runs the whole interview pre-signup against a local draft and
 * only touches the server once, via `useUpdateDietProfileMutation` below (onboarding-v2-flow-plan
 * §2) — but this stays as the read hook for post-onboarding surfaces (nutrition/profile screens)
 * that need the committed profile. Server data — TanStack Query owns it, never a Zustand store
 * (architecture.md §3).
 */
export function useDietProfileQuery() {
  return useQuery({
    queryKey: dietProfileKeys.all,
    queryFn: () => apiClient.get<DietProfile>('/users/me/diet-profile/'),
  });
}

/**
 * `PUT /users/me/diet-profile/` — v2 commits the whole draft in **one** call right after register
 * (onboarding-v2-flow-plan.md §2), not incrementally per question like the old flow did (that
 * required an authenticated session mid-interview; v2's interview runs entirely pre-signup
 * against a local draft instead). Writes the response straight into the query cache instead of
 * just invalidating, since the mock/live response already is the new canonical profile.
 */
export function useUpdateDietProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DietProfilePatch) =>
      apiClient.put<DietProfile>('/users/me/diet-profile/', patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(dietProfileKeys.all, profile);
    },
  });
}
