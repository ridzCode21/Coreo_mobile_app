// Importing this feature defines the background sync task (lib/backgroundSync.ts) and registers
// its sign-out cleanup (lib/sessionEnd.ts).
import '@/features/integrations/lib/backgroundSync';
import '@/features/integrations/lib/sessionEnd';

export { HealthSyncHost } from '@/features/integrations/components/HealthSyncHost';
export { StravaConnectButton } from '@/features/integrations/components/StravaConnectButton';
export { useHealthSync, type HealthSyncStatus } from '@/features/integrations/lib/useHealthSync';
export { useStravaConnect } from '@/features/integrations/lib/useStravaConnect';
export type { DeviceSource } from '@/features/integrations/lib/types';
