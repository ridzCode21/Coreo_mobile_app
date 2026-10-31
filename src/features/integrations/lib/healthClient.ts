import { Platform } from 'react-native';

import type { HealthSourceClient } from '@/features/integrations/lib/healthSourceClient';

type HealthConnectModule = typeof import('@/features/integrations/lib/healthConnectClient');

/**
 * The health store for this phone, or null where none is wired up yet. Android uses Health Connect
 * (issue #55). iOS HealthKit is issue #54 and plugs in here.
 */
export async function getHealthClient(): Promise<HealthSourceClient | null> {
  if (Platform.OS === 'android') {
    // Loaded only here so no other platform ever touches the Health Connect library.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy load
    const module: HealthConnectModule = require('@/features/integrations/lib/healthConnectClient');
    return module.healthConnectClient;
  }
  return null;
}
