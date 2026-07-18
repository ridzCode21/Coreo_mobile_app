import Constants from 'expo-constants';

import { liveTransport } from '@/shared/api/transport/liveTransport';
import { mockTransport } from '@/shared/api/transport/mockTransport';
import type { Transport } from '@/shared/api/transport/types';

type ApiMode = 'mock' | 'live';

const apiMode = ((Constants.expoConfig?.extra?.apiMode as string | undefined) ?? 'mock') as ApiMode;

/**
 * One env flag switches the whole app between mock and live with zero feature-code changes —
 * see docs/implementation-plan.md §2 and `EXPO_PUBLIC_API_MODE` in `.env.example`.
 */
export const transport: Transport = apiMode === 'live' ? liveTransport : mockTransport;

export { apiMode };
