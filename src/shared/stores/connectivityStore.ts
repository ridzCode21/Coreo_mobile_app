import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { create } from 'zustand';

import { isNetworkReachable, type NetworkSnapshot } from '@/shared/lib/connectivity';

type ConnectivityState = {
  /** What the phone itself reports (`expo-network`). */
  networkOnline: boolean;
  /** Test/dev switch: pretend there is no connection even when the phone has one. Also makes the
   * mock API transport fail like a dropped connection (see `mockTransport`). */
  simulatedOffline: boolean;
  /** The one value the app reads: online only when the phone is and nothing is simulated. */
  isOnline: boolean;
  setNetworkSnapshot: (snapshot: NetworkSnapshot) => void;
  setSimulatedOffline: (offline: boolean) => void;
  /** Reads the current state, starts listening for changes, and returns the stop function. Call
   * once from the root layout. */
  start: () => Promise<() => void>;
};

function resolveOnline(networkOnline: boolean, simulatedOffline: boolean): boolean {
  return networkOnline && !simulatedOffline;
}

/**
 * Connection state is small client-only state, so it lives in Zustand (architecture.md §3). It is
 * also pushed into TanStack Query's `onlineManager` so queries pause while offline and refetch
 * (including Home) the moment the connection returns.
 */
export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  networkOnline: true,
  simulatedOffline: false,
  isOnline: true,

  setNetworkSnapshot: (snapshot) => {
    const networkOnline = isNetworkReachable(snapshot);
    set({ networkOnline, isOnline: resolveOnline(networkOnline, get().simulatedOffline) });
  },

  setSimulatedOffline: (simulatedOffline) => {
    set({ simulatedOffline, isOnline: resolveOnline(get().networkOnline, simulatedOffline) });
  },

  start: async () => {
    const subscription = Network.addNetworkStateListener((state) =>
      get().setNetworkSnapshot(state),
    );
    try {
      get().setNetworkSnapshot(await Network.getNetworkStateAsync());
    } catch {
      // Could not read the state: stay on the optimistic default (online) rather than lock the
      // user out. The change listener above still corrects it on the next event.
    }
    return () => subscription.remove();
  },
}));

useConnectivityStore.subscribe((state) => onlineManager.setOnline(state.isOnline));
