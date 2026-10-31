/** Issue #55 — connecting and syncing as the screens and the background task call them. */

import { connectHealth, runHealthSync } from '@/features/integrations/lib/healthSync';
import { useSyncStore } from '@/features/integrations/store/syncStore';
const mockClient = {
  source: 'health_connect' as const,
  getAvailability: jest.fn(),
  hasPermission: jest.fn(),
  requestPermission: jest.fn(),
  readDays: jest.fn(),
  openSettings: jest.fn(),
};
const mockGetHealthClient = jest.fn();
jest.mock('@/features/integrations/lib/healthClient', () => ({
  getHealthClient: () => mockGetHealthClient(),
}));
const mockImportDeviceBatchWith = jest.fn();
jest.mock('@/features/integrations/api/integrationsApi', () => ({
  importDeviceBatchWith: (...args: unknown[]) => mockImportDeviceBatchWith(...args),
}));
jest.mock('@/features/home', () => ({ sourcesKeys: { all: ['integrationSources'] } }));

beforeEach(() => {
  jest.clearAllMocks();
  useSyncStore.setState({
    syncedThrough: null,
    lastAttemptAt: null,
    lastFailure: null,
    hydrated: true,
  });
  mockGetHealthClient.mockResolvedValue(mockClient);
  mockClient.getAvailability.mockResolvedValue('available');
  mockClient.hasPermission.mockResolvedValue(true);
  mockClient.requestPermission.mockResolvedValue(true);
  mockClient.readDays.mockImplementation(async (dates: string[]) =>
    dates.map((date) => ({
      date,
      steps: null,
      sleepIntervals: [],
      weightsKg: [],
      hrvMillis: [],
      workouts: [],
    })),
  );
  mockImportDeviceBatchWith.mockResolvedValue({ success: true });
});

describe('runHealthSync', () => {
  it('does nothing on a phone with no health store', async () => {
    mockGetHealthClient.mockResolvedValue(null);
    expect(await runHealthSync()).toEqual({ kind: 'skipped', reason: 'unsupported' });
  });

  it.each(['unavailable', 'needs_install'] as const)(
    'skips when Health Connect is %s',
    async (state) => {
      mockClient.getAvailability.mockResolvedValue(state);
      expect(await runHealthSync()).toEqual({ kind: 'skipped', reason: state });
      expect(mockClient.readDays).not.toHaveBeenCalled();
    },
  );

  it('skips, without reading or sending, when nothing is allowed', async () => {
    mockClient.hasPermission.mockResolvedValue(false);
    expect(await runHealthSync()).toEqual({ kind: 'skipped', reason: 'needs_permission' });
    expect(mockImportDeviceBatchWith).not.toHaveBeenCalled();
  });

  it('syncs, stores how far it got, and records the attempt', async () => {
    const outcome = await runHealthSync();
    expect(outcome.kind).toBe('synced');
    expect(mockImportDeviceBatchWith).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState().syncedThrough).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(useSyncStore.getState().lastAttemptAt).not.toBeNull();
  });

  it('leaves the cursor alone when the server rejects the batch', async () => {
    mockImportDeviceBatchWith.mockRejectedValue(new Error('offline'));
    await expect(runHealthSync()).rejects.toThrow('offline');
    expect(useSyncStore.getState().syncedThrough).toBeNull();
    expect(useSyncStore.getState().lastAttemptAt).not.toBeNull();
  });
});

describe('connectHealth', () => {
  it('asks for permission, then runs the first sync', async () => {
    const outcome = await connectHealth();
    expect(mockClient.requestPermission).toHaveBeenCalled();
    expect(outcome.kind).toBe('synced');
  });

  it('stops and says so when the person refuses', async () => {
    mockClient.requestPermission.mockResolvedValue(false);
    expect(await connectHealth()).toEqual({ kind: 'permission_denied' });
    expect(mockImportDeviceBatchWith).not.toHaveBeenCalled();
  });

  it('does not ask for permission when Health Connect is not there', async () => {
    mockClient.getAvailability.mockResolvedValue('needs_install');
    expect(await connectHealth()).toEqual({ kind: 'skipped', reason: 'needs_install' });
    expect(mockClient.requestPermission).not.toHaveBeenCalled();
  });
});

describe('6. the sync keeps failing and nobody is told (GitHub issue #145)', () => {
  // An expired session or a revoked permission fails every sync; the store now keeps the reason so
  // a screen (issue #57/#58) can show it.
  it('keeps the reason for the last failed sync so a screen can show it', async () => {
    mockImportDeviceBatchWith.mockRejectedValue(new Error('Your session expired.'));
    await expect(runHealthSync()).rejects.toThrow('Your session expired.');
    expect(useSyncStore.getState().lastFailure).toEqual({
      message: 'Your session expired.',
      at: expect.any(String),
    });
    expect(useSyncStore.getState().syncedThrough).toBeNull();
  });

  it('keeps the reason when reading Health Connect itself fails (permission revoked mid-sync)', async () => {
    mockClient.readDays.mockRejectedValue(new Error('SecurityException: permission revoked'));
    await expect(runHealthSync()).rejects.toThrow();
    expect(useSyncStore.getState().lastFailure?.message).toContain('permission revoked');
  });

  it('forgets the failure after a sync that works', async () => {
    mockImportDeviceBatchWith.mockRejectedValueOnce(new Error('offline'));
    await expect(runHealthSync()).rejects.toThrow();
    await runHealthSync();
    expect(useSyncStore.getState().lastFailure).toBeNull();
  });

  it('shows a non-error rejection as a generic message', async () => {
    mockImportDeviceBatchWith.mockRejectedValue('boom');
    await expect(runHealthSync()).rejects.toBe('boom');
    expect(useSyncStore.getState().lastFailure?.message).toBe('The sync could not finish.');
  });

  it("does not show the old account's failure to the next person who signs in", async () => {
    let failImport: (error: Error) => void = () => undefined;
    mockImportDeviceBatchWith.mockImplementation(
      () => new Promise<unknown>((_resolve, reject) => (failImport = reject)),
    );
    const running = runHealthSync();
    await new Promise<void>((resolve) => setImmediate(resolve));
    useSyncStore.getState().reset(); // sign-out cleanup
    failImport(new Error('Your session expired.'));
    await expect(running).rejects.toThrow();

    expect(useSyncStore.getState().lastFailure).toBeNull();
  });
});

describe('7. the person signs out while a sync is still running', () => {
  it("does not hand the old account's cursor to the next person", async () => {
    let finishImport: (value: unknown) => void = () => undefined;
    mockImportDeviceBatchWith.mockImplementation(
      () => new Promise<unknown>((resolve) => (finishImport = resolve)),
    );

    const running = runHealthSync();
    await new Promise<void>((resolve) => setImmediate(resolve)); // let it reach the server call
    useSyncStore.getState().reset(); // sign-out cleanup
    finishImport({ success: true });
    await running;

    expect(useSyncStore.getState().syncedThrough).toBeNull();
  });
});
