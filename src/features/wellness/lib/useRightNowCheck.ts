import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useRightNowQuery } from '@/features/wellness/api/rightNowApi';

const RIGHT_NOW_ROUTE = '/right-now' as Href;

export function useRightNowCheck(): void {
  const router = useRouter();
  const { data, refetch } = useRightNowQuery();
  const shownForCurrentSpike = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  useEffect(() => {
    if (!data?.breath) {
      shownForCurrentSpike.current = false;
      return;
    }
    if (!shownForCurrentSpike.current) {
      shownForCurrentSpike.current = true;
      router.push(RIGHT_NOW_ROUTE);
    }
  }, [data?.breath, router]);
}
