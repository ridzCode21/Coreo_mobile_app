import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { RightNowScreen, useRightNowQuery } from '@/features/wellness';

export default function RightNowRoute() {
  const router = useRouter();
  const query = useRightNowQuery();

  useEffect(() => {
    if (query.data?.breath === null) router.back();
  }, [query.data?.breath, router]);

  return query.data?.breath ? <RightNowScreen breath={query.data.breath} /> : null;
}
