/**
 * Issue #19 — the "Reading you" card (design lines 686-771, items 11-13) lists only the sources
 * `GET /integrations/sources/` says are actually connected
 * (`apps/integrations/source_status.py:9-46`), one fixed sentence per source
 * ("{label} — live, syncing now" — plan.md Decision log #3), never the per-source counts the design
 * mock-text shows ("214 nights of sleep in") since the API provides no such count. A disconnected
 * source is omitted; if nothing is connected, the card renders nothing at all.
 */

import { render, screen } from '@testing-library/react-native';
import { Circle, Path } from 'react-native-svg';

import { ReadingYouCard } from '@/features/home/components/ReadingYouCard';
import type { SourceStatus } from '@/features/home/api/sourcesApi';

function source(overrides: Partial<SourceStatus>): SourceStatus {
  return {
    source: 'apple_health',
    connected: false,
    last_synced_at: null,
    synced_through: null,
    ...overrides,
  };
}

describe('home: ReadingYouCard (issue #19)', () => {
  it('shows one line per connected source using the device-built sentence, never a count', () => {
    render(
      <ReadingYouCard
        sources={[
          source({
            source: 'apple_health',
            connected: true,
            last_synced_at: '2026-10-14T06:00:00Z',
          }),
          source({ source: 'strava', connected: true, last_synced_at: '2026-10-14T07:00:00Z' }),
          source({ source: 'health_connect', connected: false }),
        ]}
      />,
    );

    expect(screen.getByText('Apple Health — live, syncing now')).toBeTruthy();
    expect(screen.getByText('Strava — live, syncing now')).toBeTruthy();
    expect(screen.queryByText(/Health Connect/)).toBeNull();
    expect(screen.queryByText(/\d+ nights/)).toBeNull();
  });

  it('shows the "Reading you" eyebrow when at least one source is connected', () => {
    render(<ReadingYouCard sources={[source({ connected: true })]} />);
    expect(screen.getByText('Reading you')).toBeTruthy();
  });

  it('uses the distinct design icon for each connected source shown in frame 10b', () => {
    const view = render(
      <ReadingYouCard
        sources={[
          source({ source: 'apple_health', connected: true }),
          source({ source: 'strava', connected: true }),
        ]}
      />,
    );

    const paths = view.UNSAFE_getAllByType(Path);
    expect(paths).toHaveLength(2);
    expect(paths[0].props).toMatchObject({ d: 'M20 6L9 17l-5-5', strokeWidth: 2 });
    expect(paths[1].props).toMatchObject({
      d: 'M12 4v3M12 17v3M4 12h3M17 12h3',
      strokeWidth: 1.8,
    });

    const circles = view.UNSAFE_getAllByType(Circle);
    expect(circles).toHaveLength(1);
    expect(circles[0].props).toMatchObject({ cx: '12', cy: '12', r: '5', strokeWidth: 1.8 });
  });

  it('renders nothing when no source is connected', () => {
    const view = render(
      <ReadingYouCard
        sources={[
          source({ source: 'apple_health' }),
          source({ source: 'health_connect' }),
          source({ source: 'strava' }),
        ]}
      />,
    );
    expect(view.toJSON()).toBeNull();
  });

  it('renders nothing for an empty sources list', () => {
    const view = render(<ReadingYouCard sources={[]} />);
    expect(view.toJSON()).toBeNull();
  });
});
