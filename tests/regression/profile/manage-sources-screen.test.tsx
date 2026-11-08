/**
 * Issue #44 — "Connected sources come from the sources endpoint" (acceptance criterion), built
 * together with backend-repo issue #58 rather than duplicated (issue body). `ManageSourcesScreen`
 * is a new, read-only per-source status list behind the Profile screen's "Manage" row.
 *
 * Every round of the previous attempt at this issue failed on this exact screen because its test
 * used `screen.getByText(/Connected/i)`, which also matches "Not connected" (case-insensitive
 * substring match) — see `/Users/Nuvo/Vipin/vipin/django_frontend/scripts/overnight/.state/work/044/gates-last.txt`.
 * That was a test bug, not an implementation bug, and it was never fixed across 4 rounds. This
 * test queries each source's status by a distinct `testID` instead, so "Connected" and "Not
 * connected" can never collide.
 *
 * Issue #175 — a failed load previously showed a dead-end message (never exercised by a test).
 * Gives it working Retry (refetch) and Back (router.back) controls, matching the same 19d error
 * card pattern used by Profile and Notebook (plan.md).
 *
 * Issue #56 — the Strava row gets a real "Connect with Strava" brand button (issue body) wired to
 * `useStravaConnect` (`@/features/integrations`). `useStravaConnect` itself is covered end-to-end by
 * `tests/regression/integrations/use-strava-connect.test.tsx`; this file only checks the screen
 * wires it correctly: button shown only while disconnected, tap calls `connect`, and a surfaced
 * `errorMessage` renders without ever touching the apple_health/health_connect rows.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { Path } from 'react-native-svg';

import ManageSourcesScreen from '@/features/profile/screens/ManageSourcesScreen';
import type { SourceStatus } from '@/features/home/api/sourcesApi';
import type { HealthSyncStatus } from '@/features/integrations';
import { componentSizes, spacing } from '@/shared/theme/tokens';

let mockSources: SourceStatus[] | undefined;
let mockIsLoading = false;
let mockIsError = false;
const mockRefetch = jest.fn();

jest.mock('@/features/home/api/sourcesApi', () => {
  const actual = jest.requireActual('@/features/home/api/sourcesApi');
  return {
    ...actual,
    useSourcesQuery: () => ({
      data: mockSources,
      isLoading: mockIsLoading,
      isError: mockIsError,
      refetch: mockRefetch,
    }),
  };
});

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockConnect = jest.fn();
let mockStravaStatus: 'idle' | 'connecting' | 'exchanging' | 'success' | 'error' = 'idle';
let mockStravaErrorMessage: string | null = null;

const mockHealthConnect = jest.fn();
const mockOpenSettings = jest.fn();
let mockHealthSyncStatus: HealthSyncStatus = 'checking';

jest.mock('@/features/integrations', () => {
  const actual = jest.requireActual('@/features/integrations');
  return {
    ...actual,
    useStravaConnect: () => ({
      connect: mockConnect,
      status: mockStravaStatus,
      errorMessage: mockStravaErrorMessage,
    }),
    useHealthSync: () => ({
      status: mockHealthSyncStatus,
      syncedThrough: null,
      lastAttemptAt: null,
      connect: mockHealthConnect,
      syncNow: jest.fn(),
      openSettings: mockOpenSettings,
    }),
  };
});

describe('profile: ManageSourcesScreen (issue #44, GET /integrations/sources/)', () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = false;
    mockSources = undefined;
    mockRefetch.mockClear();
    mockBack.mockClear();
    mockConnect.mockClear();
    mockStravaStatus = 'idle';
    mockStravaErrorMessage = null;
    mockHealthConnect.mockClear();
    mockOpenSettings.mockClear();
    mockHealthSyncStatus = 'checking';
    Platform.OS = originalPlatformOs;
  });

  afterAll(() => {
    Platform.OS = originalPlatformOs;
  });

  it('shows connected vs. not-connected state per source, honestly, with no fabricated sentence', () => {
    mockSources = [
      { source: 'apple_health', connected: true, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];

    render(<ManageSourcesScreen />);

    expect(screen.getByText('Apple Health')).toBeTruthy();
    expect(screen.getByText('Health Connect')).toBeTruthy();
    expect(screen.getByText('Strava')).toBeTruthy();

    expect(screen.getByTestId('source-status-apple_health')).toHaveTextContent('Connected');
    expect(screen.getByTestId('source-status-health_connect')).toHaveTextContent('Not connected');
    expect(screen.getByTestId('source-status-strava')).toHaveTextContent('Not connected');
  });

  it('shows all three sources as not connected without inventing a "nothing else" claim', () => {
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];

    render(<ManageSourcesScreen />);

    expect(screen.getByTestId('source-status-apple_health')).toHaveTextContent('Not connected');
    expect(screen.queryByText(/nothing else/i)).toBeNull();
  });

  it('shows no per-source rows while loading, not a fabricated default status', () => {
    mockIsLoading = true;
    mockSources = undefined;

    render(<ManageSourcesScreen />);

    expect(screen.queryByTestId('source-status-apple_health')).toBeNull();
  });

  it('shows a working Retry and Back on a failed load instead of a dead end (issue #175)', () => {
    mockIsError = true;
    render(<ManageSourcesScreen />);

    expect(screen.getByText('Unable to load connected sources.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders the profile navigation control with the shared glass back treatment', () => {
    render(<ManageSourcesScreen />);

    expect(
      screen.UNSAFE_getAllByType(LinearGradient).map((gradient) => gradient.props.colors),
    ).toContainEqual(['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.25)']);
    expect(screen.UNSAFE_getAllByType(Path).map((path) => path.props.d)).toContain(
      'M15 18l-6-6 6-6',
    );
  });

  it('shows the "Connect with Strava" button only for the disconnected Strava row (issue #56)', () => {
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];

    render(<ManageSourcesScreen />);

    expect(screen.getByRole('button', { name: 'Connect with Strava' })).toBeTruthy();
  });

  it('calls useStravaConnect().connect when "Connect with Strava" is tapped (issue #56)', () => {
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];

    render(<ManageSourcesScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Connect with Strava' }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('hides the "Connect with Strava" button once Strava is connected (issue #56)', () => {
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      {
        source: 'strava',
        connected: true,
        last_synced_at: '2026-11-08T06:00:00Z',
        synced_through: null,
      },
    ];

    render(<ManageSourcesScreen />);

    expect(screen.queryByRole('button', { name: 'Connect with Strava' })).toBeNull();
    expect(screen.getByTestId('source-status-strava')).toHaveTextContent('Connected');
  });

  it('surfaces a Strava connect error message without touching the other rows (issue #56)', () => {
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];
    mockStravaStatus = 'error';
    mockStravaErrorMessage = 'Strava authorization failed. Please try connecting again.';

    render(<ManageSourcesScreen />);

    expect(
      screen.getByText('Strava authorization failed. Please try connecting again.'),
    ).toBeTruthy();
    expect(screen.getByTestId('source-status-apple_health')).toHaveTextContent('Not connected');
    expect(screen.getByTestId('source-status-health_connect')).toHaveTextContent('Not connected');
  });
});

/**
 * Issue #57 — Health Connect gets a real connect flow on this same screen, mirroring the Strava
 * row (#56) 1:1. `useHealthSync` (`@/features/integrations/lib/useHealthSync.ts`) was built in
 * issue #55 specifically for this: "the rows that show it (#57, #58) call this; none of that UI
 * lives here." Apple Health stays status-text-only on every platform: no HealthKit client exists
 * yet (issue #54, on hold), so building a connect action for it would invent a capability the app
 * does not have (plan.md, Out of scope / Blocked).
 *
 * The row's "Connected"/"Not connected" text must always come from `GET /integrations/sources/`
 * (`useSourcesQuery`), never from `useHealthSync`'s local OS-permission status — that is the
 * issue's own acceptance criterion ("not a local-only flag"). `useHealthSync` only controls
 * whether a connect action (button/message) renders underneath, and only for the `health_connect`
 * row, and only on Android (there is no Apple Health client, so iOS never gets this block either).
 */
describe('profile: ManageSourcesScreen — Health Connect connect flow (issue #57)', () => {
  const notConnectedSources: SourceStatus[] = [
    { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
    { source: 'health_connect', connected: false, last_synced_at: null, synced_through: null },
    { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
  ];

  it('shows "Connect Health Connect" on Android when permission has not been granted', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'needs_permission';

    render(<ManageSourcesScreen />);

    expect(screen.getByRole('button', { name: 'Connect Health Connect' })).toBeTruthy();
  });

  it('calls useHealthSync().connect() when "Connect Health Connect" is tapped', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'needs_permission';

    render(<ManageSourcesScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Connect Health Connect' }));
    expect(mockHealthConnect).toHaveBeenCalledTimes(1);
  });

  it('shows the needs_install message and a working "Open settings" button', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'needs_install';

    render(<ManageSourcesScreen />);

    expect(screen.getByText('Update Health Connect to keep syncing.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('shows the unavailable message with no dead-end button', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'unavailable';

    render(<ManageSourcesScreen />);

    expect(screen.getByText("Health Connect isn't available on this phone.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect Health Connect' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open settings' })).toBeNull();
  });

  it('shows an error message alongside a retry connect button', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'error';

    render(<ManageSourcesScreen />);

    expect(screen.getByText("Couldn't connect Health Connect.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect Health Connect' })).toBeTruthy();
  });

  it.each(['unsupported', 'checking'] as const)(
    'shows no Health Connect action while status is %s',
    (status) => {
      Platform.OS = 'android';
      mockSources = notConnectedSources;
      mockHealthSyncStatus = status;

      render(<ManageSourcesScreen />);

      expect(screen.queryByRole('button', { name: 'Connect Health Connect' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Open settings' })).toBeNull();
      expect(screen.queryByText("Health Connect isn't available on this phone.")).toBeNull();
      expect(screen.queryByText("Couldn't connect Health Connect.")).toBeNull();
    },
  );

  it.each(['unsupported', 'checking'] as const)(
    'keeps the default Health Connect row layout while status is %s',
    (status) => {
      Platform.OS = 'android';
      mockSources = notConnectedSources;
      mockHealthSyncStatus = status;

      render(<ManageSourcesScreen />);

      const healthConnectRow = screen.getAllByTestId('glass-card-content')[1].children[0];
      if (typeof healthConnectRow === 'string') {
        throw new Error('Expected the Health Connect row to be a native view.');
      }

      expect(healthConnectRow.props.style).toEqual(
        expect.objectContaining({
          minHeight: componentSizes.profileKnowledgeMinHeight,
          paddingHorizontal: spacing.fieldPadX,
        }),
      );
    },
  );

  it('shows no connect action once Health Connect is already connected server-side', () => {
    Platform.OS = 'android';
    mockSources = [
      { source: 'apple_health', connected: false, last_synced_at: null, synced_through: null },
      {
        source: 'health_connect',
        connected: true,
        last_synced_at: '2026-11-08T06:00:00Z',
        synced_through: '2026-11-07',
      },
      { source: 'strava', connected: false, last_synced_at: null, synced_through: null },
    ];
    mockHealthSyncStatus = 'needs_permission';

    render(<ManageSourcesScreen />);

    expect(screen.getByTestId('source-status-health_connect')).toHaveTextContent('Connected');
    expect(screen.queryByRole('button', { name: 'Connect Health Connect' })).toBeNull();
  });

  it('never shows a Health Connect action on iOS, even if the hook reports needs_permission', () => {
    Platform.OS = 'ios';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'needs_permission';

    render(<ManageSourcesScreen />);

    expect(screen.queryByRole('button', { name: 'Connect Health Connect' })).toBeNull();
  });

  it('never shows a connect action on the Apple Health row, in any state (issue #54 on hold)', () => {
    Platform.OS = 'android';
    mockSources = notConnectedSources;
    mockHealthSyncStatus = 'needs_permission';

    render(<ManageSourcesScreen />);

    const appleHealthStatus = screen.getByTestId('source-status-apple_health');
    expect(appleHealthStatus).toHaveTextContent('Not connected');
    // Only one connect action exists on the screen, and it belongs to Health Connect, not Apple Health.
    expect(screen.getAllByRole('button', { name: 'Connect Health Connect' })).toHaveLength(1);
  });
});
