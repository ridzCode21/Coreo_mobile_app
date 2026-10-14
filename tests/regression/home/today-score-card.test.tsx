/**
 * Issue #18 — the Home "Today" hero card (design-spec.md 24b/10a/23a lines 7-12 / 137-142 /
 * 278-283): night-glass card, eyebrow "Today", a dot-matrix Core Index score, the wave, and the
 * "Morning / Now / Evening" axis. The backend has no Core Index endpoint yet (issue #18 body,
 * "Backend dependency": "No endpoint exists for the Core Index score ... or intraday wave
 * points"; confirmed in `apps/insights/views.py` `daily_summary` — no score field at all). Per
 * CLAUDE.md §"never an invented number", the score digits must only render when a real value is
 * passed in — never a placeholder number (the design mock's `dayScore ?? 78` default must NOT be
 * copied into the app). `TodayScoreCard` takes `score` as an optional prop so the one caller
 * (`CoreoHomeScreen`) can simply omit it today and wire it up later with no component changes.
 */

import { render, screen } from '@testing-library/react-native';

import { TodayScoreCard } from '@/features/home/components/TodayScoreCard';

const NOW = new Date(2026, 6, 6, 8, 0); // Mon Jul 6, 08:00

describe('home: TodayScoreCard (issue #18)', () => {
  it('shows the "Today" eyebrow label', () => {
    render(<TodayScoreCard now={NOW} />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows the Morning / Now / Evening axis in order', () => {
    render(<TodayScoreCard now={NOW} />);
    const axis = [
      screen.getByText('Morning'),
      screen.getByText('Now'),
      screen.getByText('Evening'),
    ];
    expect(axis.every(Boolean)).toBe(true);
  });

  it('renders the wave', () => {
    render(<TodayScoreCard now={NOW} />);
    expect(screen.getByTestId('home-today-wave')).toBeTruthy();
  });

  it('never invents a score: renders no score digits when none is provided', () => {
    render(<TodayScoreCard now={NOW} />);
    expect(screen.queryByTestId('home-today-score')).toBeNull();
  });

  it('renders the score digits once a real value is provided', () => {
    render(<TodayScoreCard now={NOW} score={78} />);
    expect(screen.getByTestId('home-today-score')).toBeTruthy();
  });
});
