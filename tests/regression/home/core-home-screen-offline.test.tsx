/**
 * Issue #49 — design 25c: Home with no connection shows the saved day, never invents values, and
 * invites logging. Also: while online Home keeps today's saved copy fresh, and a meal the server
 * refused is not lost silently.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import CoreoHomeScreen from '@/features/home/screens/CoreoHomeScreen';
import { buildHomeCache } from '@/features/home/lib/homeCache';
import { useHomeCacheStore } from '@/features/home/store/homeCacheStore';
import { STORAGE_KEYS } from '@/shared/lib/storage';
import { useConnectivityStore } from '@/shared/stores/connectivityStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: mockPush }),
}));

jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({ data: { first_name: 'Asha' }, isLoading: false }),
}));

jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({ data: undefined, isLoading: false }),
  targetQuality: () => 'unavailable',
}));

let mockRejected = { count: 0, dismiss: jest.fn() };
let mockSummaryState: { data?: unknown; isSuccess: boolean; dataUpdatedAt: number } = {
  isSuccess: false,
  dataUpdatedAt: 0,
};
jest.mock('@/features/nutrition', () => ({
  todayISO: () => '2026-07-07',
  useDailySummaryQuery: () => ({ ...mockSummaryState, isLoading: false }),
  targetsFromProfile: () => ({ calories: 2000, protein: 150, carbs: 200, fat: 60 }),
  useRejectedMeals: () => mockRejected,
}));

const SAVED_AT = new Date(2026, 6, 7, 14, 14);

function goOffline() {
  act(() => useConnectivityStore.getState().setSimulatedOffline(true));
}

describe('home: offline state (issue #49, design 25c)', () => {
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 7, 16, 30));
    mockPush.mockClear();
    mockRejected = { count: 0, dismiss: jest.fn() };
    mockSummaryState = { isSuccess: false, dataUpdatedAt: 0 };
    await AsyncStorage.clear();
    useHomeCacheStore.setState({ cache: null, hydrated: true });
    useConnectivityStore.setState({ networkOnline: true, simulatedOffline: false, isOnline: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the design banner, "As of" badge, saved-time axis and the log prompt when offline with today saved', () => {
    useHomeCacheStore.setState({ cache: buildHomeCache('2026-07-07', SAVED_AT) });
    goOffline();
    render(<CoreoHomeScreen />);

    expect(screen.getByText('No connection. Today is cached from 2:14 PM.')).toBeTruthy();
    expect(screen.getByText('As of 2:14 PM')).toBeTruthy();
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('2:14 PM')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByTestId('home-today-wave')).toBeTruthy();
    expect(screen.getByText("Log anything — I'll sync the moment we're back.")).toBeTruthy();
    expect(screen.queryByText('Ask me anything')).toBeNull();
  });

  it('invents nothing: no nutrition/movement/hydration rows, no score, no subtitle, no live clock axis', () => {
    useHomeCacheStore.setState({ cache: buildHomeCache('2026-07-07', SAVED_AT) });
    goOffline();
    render(<CoreoHomeScreen />);

    expect(screen.queryByText('Nutrition')).toBeNull();
    expect(screen.queryByText('Movement')).toBeNull();
    expect(screen.queryByText('Hydration')).toBeNull();
    expect(screen.queryByTestId('home-today-score')).toBeNull();
    expect(screen.queryByText('Now')).toBeNull();
    expect(screen.queryByText('Evening')).toBeNull();
    expect(screen.queryByText('Today starts here.')).toBeNull();
  });

  it('first launch offline (nothing saved): only "No connection.", no cached claim, no wave', () => {
    goOffline();
    render(<CoreoHomeScreen />);

    expect(screen.getByText('No connection.')).toBeTruthy();
    expect(screen.queryByText(/cached from/)).toBeNull();
    expect(screen.queryByText(/As of/)).toBeNull();
    expect(screen.queryByTestId('home-today-wave')).toBeNull();
    expect(screen.getByText("Log anything — I'll sync the moment we're back.")).toBeTruthy();
  });

  it("yesterday's saved copy is not presented as today", () => {
    useHomeCacheStore.setState({ cache: buildHomeCache('2026-07-06', SAVED_AT) });
    goOffline();
    render(<CoreoHomeScreen />);
    expect(screen.queryByText(/cached from/)).toBeNull();
  });

  it('the log prompt opens Diet, where a meal can still be logged and queued', () => {
    goOffline();
    render(<CoreoHomeScreen />);
    fireEvent.press(screen.getByLabelText("Log anything — I'll sync the moment we're back."));
    expect(mockPush).toHaveBeenCalledWith('/diet');
  });

  it('shows the normal Home, not the offline banner, while connected', () => {
    render(<CoreoHomeScreen />);
    expect(screen.queryByText(/No connection/)).toBeNull();
    expect(screen.getByText('Ask me anything')).toBeTruthy();
    expect(screen.getByText('Now')).toBeTruthy();
  });

  it('returns to the normal Home when the connection comes back', () => {
    goOffline();
    render(<CoreoHomeScreen />);
    expect(screen.getByText('No connection.')).toBeTruthy();
    act(() => useConnectivityStore.getState().setSimulatedOffline(false));
    expect(screen.queryByText(/No connection/)).toBeNull();
    expect(screen.getByText('Ask me anything')).toBeTruthy();
  });

  it("while online, remembers when today's summary was last fetched, and keeps nothing else", async () => {
    mockSummaryState = { isSuccess: true, dataUpdatedAt: SAVED_AT.getTime() };
    render(<CoreoHomeScreen />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(useHomeCacheStore.getState().cache).toEqual(buildHomeCache('2026-07-07', SAVED_AT));
    const onDisk = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.homeCache)) ?? 'null');
    expect(Object.keys(onDisk).sort()).toEqual(['date', 'savedAt', 'version']);
  });

  it('does not save anything while offline', async () => {
    mockSummaryState = { isSuccess: true, dataUpdatedAt: SAVED_AT.getTime() };
    goOffline();
    render(<CoreoHomeScreen />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(useHomeCacheStore.getState().cache).toBeNull();
  });

  it('tells the user when a queued meal was refused, and dismisses on tap', () => {
    mockRejected = { count: 2, dismiss: jest.fn() };
    render(<CoreoHomeScreen />);
    fireEvent.press(screen.getByText("2 logged meals couldn't be saved."));
    expect(mockRejected.dismiss).toHaveBeenCalled();
  });
});
