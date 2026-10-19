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
 */

import { render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Path } from 'react-native-svg';

import ManageSourcesScreen from '@/features/profile/screens/ManageSourcesScreen';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

let mockSources: SourceStatus[] | undefined;
let mockIsLoading = false;

jest.mock('@/features/home/api/sourcesApi', () => {
  const actual = jest.requireActual('@/features/home/api/sourcesApi');
  return {
    ...actual,
    useSourcesQuery: () => ({ data: mockSources, isLoading: mockIsLoading }),
  };
});

describe('profile: ManageSourcesScreen (issue #44, GET /integrations/sources/)', () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockSources = undefined;
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

  it('renders the profile navigation control with the shared glass back treatment', () => {
    render(<ManageSourcesScreen />);

    expect(
      screen.UNSAFE_getAllByType(LinearGradient).map((gradient) => gradient.props.colors),
    ).toContainEqual(['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.25)']);
    expect(screen.UNSAFE_getAllByType(Path).map((path) => path.props.d)).toContain(
      'M15 18l-6-6 6-6',
    );
  });
});
