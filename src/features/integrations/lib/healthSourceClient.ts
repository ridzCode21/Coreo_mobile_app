import type { DayRecords } from '@/features/integrations/lib/dayTotals';
import type { DeviceSource } from '@/features/integrations/lib/types';

export type HealthAvailability = 'available' | 'unavailable' | 'needs_install';

/**
 * The one seam between the sync logic and a platform's health store. Health Connect (Android,
 * issue #55) implements it today; HealthKit (iOS, issue #54) will implement the same shape, so
 * the runner, payload building and status hook are shared.
 */
export type HealthSourceClient = {
  source: DeviceSource;
  getAvailability: () => Promise<HealthAvailability>;
  /** True when at least one of the metrics we read has been allowed. */
  hasPermission: () => Promise<boolean>;
  /** Shows the system permission screen; resolves true when something was granted. */
  requestPermission: () => Promise<boolean>;
  /** Raw records for the given local days (oldest first), already in the backend's units. */
  readDays: (dates: string[]) => Promise<DayRecords[]>;
  /** Opens the system screen where the person can change or revoke access. */
  openSettings: () => void;
};
