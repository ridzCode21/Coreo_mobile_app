export type SignOutSheetState =
  { kind: 'default' } | { kind: 'pendingMeals'; count: number } | { kind: 'offline' };

export type SignOutSheetCopy = {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
};

export function resolveSignOutSheetState({
  isOnline,
  pendingMealCount,
}: {
  isOnline: boolean;
  pendingMealCount: number;
}): SignOutSheetState {
  if (pendingMealCount > 0) return { kind: 'pendingMeals', count: pendingMealCount };
  return isOnline ? { kind: 'default' } : { kind: 'offline' };
}

export function signOutSheetCopy(state: SignOutSheetState): SignOutSheetCopy {
  switch (state.kind) {
    case 'default':
      return {
        title: 'Sign out?',
        body: "You'll need to sign in again to see your core. Everything stays saved.",
        primaryLabel: 'Sign out',
        secondaryLabel: 'Cancel',
      };
    case 'offline':
      return {
        title: 'Offline',
        body: "You're offline. You can still sign out — you'll just need to sign in when you're back online.",
        primaryLabel: 'Sign out',
        secondaryLabel: 'Cancel',
      };
    case 'pendingMeals': {
      const plural = state.count === 1 ? '' : 's';
      const has = state.count === 1 ? "hasn't" : "haven't";
      const pronoun = state.count === 1 ? "it'll" : "they'll";
      return {
        title: `${state.count} meal${plural} syncing`,
        body: `${state.count} meal${plural} ${has} finished syncing. If you sign out now, ${pronoun} be lost.`,
        primaryLabel: 'Sign out anyway',
        secondaryLabel: 'Wait',
      };
    }
  }
}
