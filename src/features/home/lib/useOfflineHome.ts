import { useEffect, useMemo } from 'react';

import { useConnectivityStore } from '@/shared/stores/connectivityStore';
import { buildOfflineHomeView, type OfflineHomeView } from '@/features/home/lib/offlineHome';
import { useHomeCacheStore } from '@/features/home/store/homeCacheStore';

type SummaryFetchState = {
  isSuccess: boolean;
  /** TanStack's "last successful fetch" time in ms (`query.dataUpdatedAt`). */
  dataUpdatedAt: number;
};

/**
 * Keeps the saved copy of today's Home summary up to date while online and turns connection state
 * plus that copy into the offline view (issue #49). `summary` is the existing daily-summary query,
 * so Home still reads server data only through TanStack Query.
 */
export function useOfflineHome(summary: SummaryFetchState, today: string): OfflineHomeView {
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const cache = useHomeCacheStore((state) => state.cache);
  const hydrate = useHomeCacheStore((state) => state.hydrate);
  const save = useHomeCacheStore((state) => state.save);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const { isSuccess, dataUpdatedAt } = summary;
  useEffect(() => {
    if (!isOnline || !isSuccess || dataUpdatedAt <= 0) return;
    const alreadySaved =
      cache?.date === today && new Date(cache.savedAt).getTime() >= dataUpdatedAt;
    if (!alreadySaved) void save(today, new Date(dataUpdatedAt));
  }, [isOnline, isSuccess, dataUpdatedAt, today, cache, save]);

  return useMemo(() => buildOfflineHomeView({ isOnline, cache, today }), [isOnline, cache, today]);
}
