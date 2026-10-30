/**
 * Issue #17 — `CoreoHomeScreen` must show the design's header/greeting/date and pillar petals
 * (design-spec.md 24b/10a), and stop showing the blocks the design doesn't have. Pre-fix: no date,
 * a centred uppercase "Coreo" label instead of the header row, no name (issue current-behavior,
 * `CoreoHomeScreen.tsx:91`, `:283-288`), and three extra cards not in the design — "Personalize
 * your diet" (`:132-147`, already duplicated properly on the Diet tab by
 * `DietPersonalizationCard`), the "+ Log meal"/"+ Add workout" pills (`:149-166`, "+ Log meal"
 * duplicates the Diet tab's own "Log a meal" pill; "+ Add workout" only ever pointed at the
 * Fitness placeholder tab), and the "Signals" card (`:168-207`). Decision: all three are removed
 * from Home rather than kept (see plan.md Decision log); this test locks that in. The existing
 * "Today" nutrition/movement/hydration card is untouched — the issue doesn't call it out as extra,
 * so it's out of this issue's diff.
 *
 * Issue #18 — adds the design's "Today" hero wave/score card, the "Your core" nudge card, and the
 * "Ask me anything" bar (design-spec.md 24b/10a lines 7-20). The Core Index score, the nudge text
 * and the "ahead of yesterday" comparison had no backend source yet (issue #18 body), so they
 * stayed hidden rather than showing an invented value — only the hero card's eyebrow label, axis
 * and decorative wave (driven by the clock, not fabricated data) could actually render then. This
 * introduces a second element with the exact text "Today" (the hero card's eyebrow, alongside the
 * pre-existing nutrition card's own "Today" label) — the single-match assertion below is updated
 * to expect both, not weakened.
 *
 * Issue #133 — now that the backend provides both sources (`vs_yesterday` on `/daily-summary/`,
 * `apps/insights/views.py:178,190-229`; `GET /users/me/nudge/`,
 * `apps/users/services/nudge.py:37-41,88-100`), the comparison line and the nudge card are wired
 * for real. The design (every Home variant in the design file — 24b/10a/23a/23b/23c) only ever
 * shows the literal string "You're running ahead of yesterday." in this subtitle position, with no
 * alternate wording anywhere for "behind"/"level"/no-comparison — so the old placeholder
 * `headline` copy ("Today starts here.", "Here's where today stands.", "Today, your core is
 * readable.", "A pattern is starting to show.", none of which appear in the design) is replaced:
 * the subtitle now renders only when `vs_yesterday === 'ahead'`, using the design's exact string,
 * and renders nothing for `'behind'`, `'level'`, or `null` (plan.md Decision log #1-2). The nudge
 * card now mounts with the real `nudge.home_line` whenever the API returns a winning rule, and
 * stays hidden for the two no-nudge shapes (plan.md Decision log #3).
 *
 * Issue #136 — `/daily-summary/` now returns `core_index` (`apps/insights/views.py:187-192`,
 * `apps/users/services/core_index.py:17-30`), so the hero card's score digits are wired from that
 * field instead of staying permanently absent. `core_index` is `number | null` — `null` means no
 * index (calibration incomplete, nothing logged, or no scoring formula yet), never zero. The old
 * issue-#18 test asserting the score never renders is replaced: the digits render when the backend
 * returns a number, and stay absent (never an invented placeholder) when it returns `null` or the
 * summary hasn't loaded yet.
 */

import { render, screen } from '@testing-library/react-native';

import CoreoHomeScreen from '@/features/home/screens/CoreoHomeScreen';
import type { DietProfile } from '@/shared/types/dietProfile';
import type { DailySummary } from '@/shared/types/dailyLog';

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

let mockProfileData: { first_name: string } | undefined;
let mockProfileLoading = false;
jest.mock('@/features/auth', () => ({
  useProfileQuery: () => ({ data: mockProfileData, isLoading: mockProfileLoading }),
}));

let mockDietProfile: Partial<DietProfile> | undefined;
jest.mock('@/features/onboarding', () => ({
  useDietProfileQuery: () => ({ data: mockDietProfile, isLoading: false }),
  targetQuality: () => 'unavailable',
}));

let mockSummary: Partial<DailySummary> | undefined;
jest.mock('@/features/nutrition', () => ({
  todayISO: () => '2026-07-06',
  useDailySummaryQuery: () => ({ data: mockSummary, isLoading: false }),
  useRejectedMeals: () => ({ count: 0, dismiss: jest.fn() }),
  targetsFromProfile: () => ({ calories: 2000, protein: 150, carbs: 200, fat: 60 }),
}));

type MockNudgeData =
  | { nudge: null; message: string | null }
  | { nudge: { home_line: string; [key: string]: unknown } };
let mockNudgeData: MockNudgeData | undefined;
jest.mock('@/features/home/api/nudgeApi', () => ({
  useNudgeQuery: () => ({ data: mockNudgeData, isLoading: false }),
}));

describe('home: CoreoHomeScreen (issue #17)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 6, 8, 0)); // Mon Jul 6, 08:00 → Morning
    mockProfileData = { first_name: 'Asha' };
    mockProfileLoading = false;
    mockDietProfile = { daily_calories: 2000 } as Partial<DietProfile>;
    mockSummary = undefined;
    mockNudgeData = { nudge: null, message: null };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the header row: lowercase "coreo" wordmark and today\'s date, not the old centred "Coreo" eyebrow', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getByText('coreo')).toBeTruthy();
    expect(screen.getByText('Mon · Jul 6')).toBeTruthy();
    expect(screen.queryByText('Coreo')).toBeNull();
  });

  it('greets the signed-in user by first name', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getByText(/Morning,/)).toBeTruthy();
    expect(screen.getByText(/Asha\./)).toBeTruthy();
  });

  it('never invents a name: shows the time-of-day greeting without a name while the profile is still loading', () => {
    mockProfileData = undefined;
    mockProfileLoading = true;
    render(<CoreoHomeScreen />);
    expect(screen.getByText(/Morning,/)).toBeTruthy();
    expect(screen.queryByText(/Asha/)).toBeNull();
  });

  it('shows the four pillar petals in design order with labels only', () => {
    render(<CoreoHomeScreen />);
    const buttons = screen.getAllByRole('button');
    const petalLabels = buttons
      .map((b) => b.props.accessibilityLabel as string)
      .filter((label) => ['Wellness', 'Fitness', 'Diet', 'Core'].includes(label));
    expect(petalLabels).toEqual(['Wellness', 'Fitness', 'Diet']);
    expect(screen.getByText('Core')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Core' })).toBeNull();
  });

  it('no longer shows the "Personalize your diet" card (already on the Diet tab via DietPersonalizationCard)', () => {
    mockDietProfile = { daily_calories: 2000, diet_type: null } as Partial<DietProfile>;
    render(<CoreoHomeScreen />);
    expect(screen.queryByText('Personalize your diet')).toBeNull();
    expect(screen.queryByText(/3 quick things/)).toBeNull();
  });

  it('no longer shows the "+ Log meal" / "+ Add workout" quick-action pills', () => {
    render(<CoreoHomeScreen />);
    expect(screen.queryByRole('button', { name: 'Log a meal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add workout' })).toBeNull();
  });

  it('no longer shows the "Signals" card or its empty-state copy', () => {
    render(<CoreoHomeScreen />);
    expect(screen.queryByText('Signals')).toBeNull();
    expect(screen.queryByText('No health signals yet.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add water' })).toBeNull();
  });

  it('still shows the existing "Today" nutrition/movement/hydration card, alongside the new "Today" hero card (issue #18)', () => {
    render(<CoreoHomeScreen />);
    expect(screen.getAllByText('Today')).toHaveLength(2);
    expect(screen.getByText('Nutrition')).toBeTruthy();
    expect(screen.getByText('Movement')).toBeTruthy();
    expect(screen.getByText('Hydration')).toBeTruthy();
  });

  describe('issue #18: Today hero wave/score, the one nudge, Ask me anything', () => {
    it('shows the Today hero card wave and the Morning / Now / Evening axis', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByTestId('home-today-wave')).toBeTruthy();
      expect(screen.getByText('Morning')).toBeTruthy();
      expect(screen.getByText('Now')).toBeTruthy();
      expect(screen.getByText('Evening')).toBeTruthy();
    });

    it('shows the "Ask me anything" bar as a static placeholder (no chat screen to wire it to yet)', () => {
      render(<CoreoHomeScreen />);
      expect(screen.getByText('Ask me anything')).toBeTruthy();
    });
  });

  describe('issue #136: the Core Index score from the backend', () => {
    it('shows the score digits when the backend returns a value', () => {
      mockSummary = { core_index: 42 } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.getByTestId('home-today-score')).toBeTruthy();
    });

    it('never invents a score: shows no digits when core_index is null', () => {
      mockSummary = { core_index: null } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByTestId('home-today-score')).toBeNull();
    });

    it('never invents a score: shows no digits while the summary has not loaded yet', () => {
      mockSummary = undefined;
      render(<CoreoHomeScreen />);
      expect(screen.queryByTestId('home-today-score')).toBeNull();
    });
  });

  describe('issue #133: the "ahead of yesterday" comparison line', () => {
    it('shows the design\'s exact subtitle when vs_yesterday is "ahead"', () => {
      mockSummary = { vs_yesterday: 'ahead' } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.getByText("You're running ahead of yesterday.")).toBeTruthy();
    });

    it('shows nothing for "behind": the design defines no wording for it', () => {
      mockSummary = { vs_yesterday: 'behind' } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByText("You're running ahead of yesterday.")).toBeNull();
      expect(screen.queryByText(/yesterday/i)).toBeNull();
    });

    it('shows nothing for "level": the design defines no wording for it', () => {
      mockSummary = { vs_yesterday: 'level' } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByText(/yesterday/i)).toBeNull();
    });

    it('shows nothing when vs_yesterday is null', () => {
      mockSummary = { vs_yesterday: null } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByText(/yesterday/i)).toBeNull();
    });

    it('never falls back to the old invented headline copy, in any state', () => {
      mockSummary = { vs_yesterday: null } as Partial<DailySummary>;
      render(<CoreoHomeScreen />);
      expect(screen.queryByText('Today starts here.')).toBeNull();
      expect(screen.queryByText("Here's where today stands.")).toBeNull();
      expect(screen.queryByText('Today, your core is readable.')).toBeNull();
      expect(screen.queryByText('A pattern is starting to show.')).toBeNull();
    });
  });

  describe('issue #133: the one nudge card', () => {
    it('shows nothing when the API returns the onboarding/calibrating empty shape', () => {
      mockNudgeData = { nudge: null, message: null };
      render(<CoreoHomeScreen />);
      expect(screen.queryByText('Your core')).toBeNull();
    });

    it('shows nothing when the API returns the "nothing fired" empty shape', () => {
      mockNudgeData = { nudge: null, message: 'Nothing today.' };
      render(<CoreoHomeScreen />);
      expect(screen.queryByText('Your core')).toBeNull();
    });

    it('mounts CoreNudgeCard with the real home_line when a rule wins', () => {
      mockNudgeData = {
        nudge: {
          home_line: "Eat carbs in the next hour and tonight's session will feel easy.",
        },
      };
      render(<CoreoHomeScreen />);
      expect(screen.getByText('Your core')).toBeTruthy();
      expect(
        screen.getByText("Eat carbs in the next hour and tonight's session will feel easy."),
      ).toBeTruthy();
    });

    it('never invents nudge copy: renders exactly whatever home_line the API returns', () => {
      mockNudgeData = { nudge: { home_line: 'A different nudge, from the mocked API.' } };
      render(<CoreoHomeScreen />);
      expect(screen.getByText('A different nudge, from the mocked API.')).toBeTruthy();
      expect(
        screen.queryByText("Eat carbs in the next hour and tonight's session will feel easy."),
      ).toBeNull();
    });
  });
});
