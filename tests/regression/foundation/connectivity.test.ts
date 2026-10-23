/**
 * Issue #49 — connection detection. Unknown is never "offline"; the store follows the phone's
 * change events; `setSimulatedOffline` is the switch tests and dev use in mock mode, and it makes
 * the mock API fail like a dropped connection.
 */

import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/errors';
import { apiClient } from '@/shared/api/client';
import { isNetworkReachable } from '@/shared/lib/connectivity';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';

describe('foundation: connectivity (issue #49)', () => {
  beforeEach(() => {
    useConnectivityStore.setState({
      networkOnline: true,
      simulatedOffline: false,
      isOnline: true,
    });
  });

  it('only calls the phone offline when it says so', () => {
    expect(isNetworkReachable({})).toBe(true);
    expect(isNetworkReachable({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isNetworkReachable({ isConnected: true })).toBe(true);
    expect(isNetworkReachable({ isConnected: false })).toBe(false);
    expect(isNetworkReachable({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('follows the phone and tells TanStack Query so queries pause and refetch', () => {
    useConnectivityStore.getState().setNetworkSnapshot({ isConnected: false });
    expect(useConnectivityStore.getState().isOnline).toBe(false);
    expect(onlineManager.isOnline()).toBe(false);

    useConnectivityStore
      .getState()
      .setNetworkSnapshot({ isConnected: true, isInternetReachable: true });
    expect(useConnectivityStore.getState().isOnline).toBe(true);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('simulated offline wins over a healthy phone connection, and lifting it restores it', () => {
    useConnectivityStore.getState().setSimulatedOffline(true);
    expect(useConnectivityStore.getState().isOnline).toBe(false);
    useConnectivityStore.getState().setSimulatedOffline(false);
    expect(useConnectivityStore.getState().isOnline).toBe(true);
  });

  it('start() reads the current state, listens for changes and can stop listening', async () => {
    const remove = jest.fn();
    let listener: (state: Network.NetworkStateEvent) => void = () => undefined;
    (Network.addNetworkStateListener as jest.Mock).mockImplementationOnce((cb) => {
      listener = cb;
      return { remove };
    });
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });

    const stop = await useConnectivityStore.getState().start();
    expect(useConnectivityStore.getState().isOnline).toBe(false);

    listener({ type: Network.NetworkStateType.WIFI, isConnected: true, isInternetReachable: true });
    expect(useConnectivityStore.getState().isOnline).toBe(true);

    stop();
    expect(remove).toHaveBeenCalled();
  });

  it('makes the mock API fail like a dropped connection while simulated offline', async () => {
    useConnectivityStore.getState().setSimulatedOffline(true);
    await expect(apiClient.get('/daily-summary/?date=2026-07-07', { auth: false })).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({ kind: 'network' }),
    );
  });
});
