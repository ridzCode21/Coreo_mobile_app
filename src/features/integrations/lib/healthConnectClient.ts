import type { Permission } from 'react-native-health-connect';

import { bucketRecords, type WindowRecords } from '@/features/integrations/lib/bucketRecords';
import { titleCaseConstant } from '@/features/integrations/lib/exerciseName';
import type { HealthSourceClient } from '@/features/integrations/lib/healthSourceClient';
import { reportError } from '@/shared/lib/reportError';

// The library is loaded on first use so it is never touched on a platform without Health Connect.
const loadLibrary = async () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy load
  require('react-native-health-connect') as typeof import('react-native-health-connect');

const READ_TYPES = [
  'Steps',
  'SleepSession',
  'HeartRateVariabilityRmssd',
  'Weight',
  'ExerciseSession',
] as const;
type ReadType = (typeof READ_TYPES)[number];

const READ_PERMISSIONS: Permission[] = READ_TYPES.map((recordType) => ({
  accessType: 'read',
  recordType,
}));

// `SdkAvailabilityStatus` values from the library's constants.
const SDK_AVAILABLE = 3;
const SDK_PROVIDER_UPDATE_REQUIRED = 2;

// Stages that count as time asleep (the rest — awake, out of bed, unknown — do not).
const ASLEEP_STAGES = new Set([2, 4, 5, 6]); // SLEEPING, LIGHT, DEEP, REM

let initialized: Promise<boolean> | null = null;
async function ready() {
  const library = await loadLibrary();
  initialized ??= library.initialize();
  await initialized;
  return library;
}

async function grantedTypes(): Promise<Set<ReadType>> {
  const library = await ready();
  const granted = await library.getGrantedPermissions();
  return new Set(
    granted
      .filter((permission) => permission.accessType === 'read')
      .map((permission) => permission.recordType)
      .filter((type): type is ReadType => (READ_TYPES as readonly string[]).includes(type)),
  );
}

function dayBounds(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return {
    start: new Date(year, month - 1, day).toISOString(),
    end: new Date(year, month - 1, day + 1).toISOString(),
  };
}

async function readAll<T extends ReadType>(recordType: T, startTime: string, endTime: string) {
  const library = await ready();
  const records = [];
  let pageToken: string | undefined;
  do {
    const page = await library.readRecords(recordType, {
      timeRangeFilter: { operator: 'between', startTime, endTime },
      pageToken,
    });
    records.push(...page.records);
    // Some Android 12/13 builds return "" instead of nothing for the last page.
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return records;
}

export const healthConnectClient: HealthSourceClient = {
  source: 'health_connect',

  async getAvailability() {
    const library = await loadLibrary();
    const status = await library.getSdkStatus();
    if (status === SDK_AVAILABLE) return 'available';
    if (status === SDK_PROVIDER_UPDATE_REQUIRED) return 'needs_install';
    return 'unavailable';
  },

  async hasPermission() {
    return (await grantedTypes()).size > 0;
  },

  async requestPermission() {
    const library = await ready();
    await library.requestPermission(READ_PERMISSIONS);
    try {
      // Reading while the app is closed is a separate, optional grant; refusing it only means
      // the app syncs when it is opened.
      await library.requestPermission([
        { accessType: 'read', recordType: 'BackgroundAccessPermission' },
      ]);
    } catch (error) {
      // Not available on this version of Health Connect — foreground sync still works.
      reportError(error, 'health-connect.background-permission');
    }
    return (await grantedTypes()).size > 0;
  },

  async readDays(dates) {
    if (dates.length === 0) return [];
    const granted = await grantedTypes();
    const library = await ready();
    const windowStart = dayBounds(dates[0]).start;
    const windowEnd = dayBounds(dates[dates.length - 1]).end;
    const exerciseNames = Object.fromEntries(
      Object.entries(library.ExerciseType).map(([name, code]) => [code, name]),
    );

    const records: WindowRecords = {
      stepsByDate: {},
      sleepSessions: [],
      weights: [],
      hrv: [],
      workouts: [],
    };

    if (granted.has('Steps')) {
      for (const date of dates) {
        const { start, end } = dayBounds(date);
        // Aggregating (not summing raw records) avoids counting steps twice across apps.
        const total = await library.aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: { operator: 'between', startTime: start, endTime: end },
        });
        records.stepsByDate[date] = total.COUNT_TOTAL ?? 0;
      }
    }

    if (granted.has('SleepSession')) {
      for (const session of await readAll('SleepSession', windowStart, windowEnd)) {
        const stages = session.stages ?? [];
        const asleep =
          stages.length > 0
            ? stages
                .filter((stage) => ASLEEP_STAGES.has(stage.stage))
                .map((stage) => ({ start: stage.startTime, end: stage.endTime }))
            : [{ start: session.startTime, end: session.endTime }];
        records.sleepSessions.push({ start: session.startTime, end: session.endTime, asleep });
      }
    }

    if (granted.has('Weight')) {
      for (const record of await readAll('Weight', windowStart, windowEnd)) {
        records.weights.push({ time: record.time, kg: record.weight.inKilograms });
      }
    }

    if (granted.has('HeartRateVariabilityRmssd')) {
      for (const record of await readAll('HeartRateVariabilityRmssd', windowStart, windowEnd)) {
        records.hrv.push({ time: record.time, millis: record.heartRateVariabilityMillis });
      }
    }

    if (granted.has('ExerciseSession')) {
      for (const record of await readAll('ExerciseSession', windowStart, windowEnd)) {
        records.workouts.push({
          type: titleCaseConstant(exerciseNames[record.exerciseType] ?? 'OTHER_WORKOUT'),
          start: record.startTime,
          end: record.endTime,
        });
      }
    }

    return bucketRecords(dates, records);
  },

  openSettings() {
    void loadLibrary().then((library) => library.openHealthConnectSettings());
  },
};
