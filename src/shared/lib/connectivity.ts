/**
 * Pure connection-state rules, kept apart from `expo-network` so they can be unit tested.
 * `expo-network` reports `isConnected` (joined a network) and `isInternetReachable` (that network
 * actually reaches the internet); either can be `undefined` while the phone is still working it
 * out. We only call the phone offline when one of them says `false`, so an unknown state never
 * hides the app behind an offline screen.
 */
export type NetworkSnapshot = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

export function isNetworkReachable(snapshot: NetworkSnapshot): boolean {
  return snapshot.isConnected !== false && snapshot.isInternetReachable !== false;
}
