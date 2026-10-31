/**
 * Issue #55 — the Health Connect reader, with the native mockLibrary replaced by a fake. Checks what
 * we ask for (read-only, five metrics), what we skip when a permission was refused, and how raw
 * records become day records.
 */

import { healthConnectClient } from '@/features/integrations/lib/healthConnectClient';
const mockLibrary = {
  initialize: jest.fn(async () => true),
  getSdkStatus: jest.fn(async () => 3),
  getGrantedPermissions: jest.fn(),
  requestPermission: jest.fn(),
  readRecords: jest.fn(),
  aggregateRecord: jest.fn(),
  openHealthConnectSettings: jest.fn(),
  ExerciseType: { OTHER_WORKOUT: 0, RUNNING: 56, STRENGTH_TRAINING: 70 },
};
jest.mock('react-native-health-connect', () => mockLibrary);

const read = (recordType: string) => ({ accessType: 'read', recordType });
const allReads = [
  read('Steps'),
  read('SleepSession'),
  read('HeartRateVariabilityRmssd'),
  read('Weight'),
  read('ExerciseSession'),
];
const at = (day: number, hour: number) => new Date(2026, 5, day, hour).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  mockLibrary.getSdkStatus.mockResolvedValue(3);
  mockLibrary.getGrantedPermissions.mockResolvedValue(allReads);
  mockLibrary.requestPermission.mockResolvedValue(allReads);
  mockLibrary.readRecords.mockResolvedValue({ records: [] });
  mockLibrary.aggregateRecord.mockResolvedValue({ COUNT_TOTAL: 0 });
});

describe('availability and permission', () => {
  it.each([
    [3, 'available'],
    [2, 'needs_install'],
    [1, 'unavailable'],
  ])('maps Health Connect status %s to %s', async (status, expected) => {
    mockLibrary.getSdkStatus.mockResolvedValue(status);
    expect(await healthConnectClient.getAvailability()).toBe(expected);
  });

  it('counts as allowed when at least one of our read permissions is granted', async () => {
    mockLibrary.getGrantedPermissions.mockResolvedValue([read('Steps')]);
    expect(await healthConnectClient.hasPermission()).toBe(true);
  });

  it('is not allowed when nothing is granted, or only write access to something else', async () => {
    mockLibrary.getGrantedPermissions.mockResolvedValue([
      { accessType: 'write', recordType: 'Steps' },
    ]);
    expect(await healthConnectClient.hasPermission()).toBe(false);
  });

  it('asks for read access to exactly the five metrics, never write', async () => {
    await healthConnectClient.requestPermission();
    const asked = mockLibrary.requestPermission.mock.calls[0][0] as { accessType: string }[];
    expect(asked).toEqual(allReads);
    expect(asked.every((permission) => permission.accessType === 'read')).toBe(true);
  });

  it('still reports success when the optional background grant is refused', async () => {
    mockLibrary.requestPermission
      .mockResolvedValueOnce(allReads)
      .mockRejectedValueOnce(new Error('feature unavailable'));
    expect(await healthConnectClient.requestPermission()).toBe(true);
  });

  it('reports failure when the person allows nothing', async () => {
    mockLibrary.requestPermission.mockResolvedValue([]);
    mockLibrary.getGrantedPermissions.mockResolvedValue([]);
    expect(await healthConnectClient.requestPermission()).toBe(false);
  });
});

describe('readDays', () => {
  it('turns raw records into one record per local day, in backend units', async () => {
    mockLibrary.aggregateRecord.mockImplementation(async () => ({ COUNT_TOTAL: 8400 }));
    mockLibrary.readRecords.mockImplementation(async (type: string) => {
      switch (type) {
        case 'SleepSession':
          return {
            records: [
              {
                startTime: at(7, 23),
                endTime: at(8, 7),
                stages: [
                  { stage: 1, startTime: at(7, 23), endTime: at(8, 0) }, // awake — not counted
                  { stage: 4, startTime: at(8, 0), endTime: at(8, 7) }, // light
                ],
              },
            ],
          };
        case 'Weight':
          return { records: [{ time: at(8, 7), weight: { inKilograms: 82.4 } }] };
        case 'HeartRateVariabilityRmssd':
          return { records: [{ time: at(8, 6), heartRateVariabilityMillis: 48 }] };
        case 'ExerciseSession':
          return { records: [{ startTime: at(8, 18), endTime: at(8, 19), exerciseType: 56 }] };
        default:
          return { records: [] };
      }
    });

    const [day] = await healthConnectClient.readDays(['2026-06-08']);

    expect(day).toMatchObject({
      date: '2026-06-08',
      steps: 8400,
      sleepIntervals: [{ start: at(8, 0), end: at(8, 7) }],
      weightsKg: [{ time: at(8, 7), kg: 82.4 }],
      hrvMillis: [48],
      workouts: [{ type: 'Running', start: at(8, 18), end: at(8, 19) }],
    });
  });

  it('treats a sleep session without stages as asleep for the whole session', async () => {
    mockLibrary.readRecords.mockImplementation(async (type: string) =>
      type === 'SleepSession'
        ? { records: [{ startTime: at(7, 23), endTime: at(8, 6) }] }
        : { records: [] },
    );
    const [day] = await healthConnectClient.readDays(['2026-06-08']);
    expect(day.sleepIntervals).toEqual([{ start: at(7, 23), end: at(8, 6) }]);
  });

  it('does not ask for a metric the person refused', async () => {
    mockLibrary.getGrantedPermissions.mockResolvedValue([read('Steps')]);
    mockLibrary.aggregateRecord.mockResolvedValue({ COUNT_TOTAL: 100 });

    const [day] = await healthConnectClient.readDays(['2026-06-08']);

    expect(day.steps).toBe(100);
    expect(mockLibrary.readRecords).not.toHaveBeenCalled();
  });

  it('reads every page, including the empty-string page token some Android versions return', async () => {
    mockLibrary.readRecords.mockImplementation(
      async (type: string, options: { pageToken?: string }) => {
        if (type !== 'Weight') return { records: [] };
        return options.pageToken === 'next'
          ? { records: [{ time: at(8, 20), weight: { inKilograms: 82 } }], pageToken: '' }
          : { records: [{ time: at(8, 7), weight: { inKilograms: 83 } }], pageToken: 'next' };
      },
    );
    const [day] = await healthConnectClient.readDays(['2026-06-08']);
    expect(day.weightsKg).toHaveLength(2);
  });

  it('asks for steps once per day with an aggregate, so two apps are not double counted', async () => {
    await healthConnectClient.readDays(['2026-06-08', '2026-06-09']);
    expect(mockLibrary.aggregateRecord).toHaveBeenCalledTimes(2);
    expect(mockLibrary.aggregateRecord.mock.calls[0][0]).toMatchObject({ recordType: 'Steps' });
  });
});
