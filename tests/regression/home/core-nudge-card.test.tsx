/**
 * Issue #18 — the "Your core · Now" nudge card (design-spec.md 24b/10a lines 13-15 / 143-145,
 * markup lines 71-82 / 186-195): light-glass card, "Your core" title, "Now" eyebrow, one line of
 * body copy. The backend has no nudge-text endpoint (issue #18 "Backend dependency": "No endpoint
 * exists for ... the one-line nudge text"; tracked separately as vipin4250/Self_dev#44). So this
 * component must never hardcode the design mock's placeholder copy ("Eat carbs in the next
 * hour...") — it only ever displays whatever `text` its caller passes, proving no invented copy
 * lives inside the component itself. `CoreoHomeScreen` currently has no nudge source, so it simply
 * does not render this card yet (see core-home-screen.test.tsx).
 */

import { render, screen } from '@testing-library/react-native';

import { CoreNudgeCard } from '@/features/home/components/CoreNudgeCard';

describe('home: CoreNudgeCard (issue #18)', () => {
  it('shows the "Your core" title and "Now" eyebrow', () => {
    render(
      <CoreNudgeCard text="Eat carbs in the next hour and tonight's session will feel easy." />,
    );
    expect(screen.getByText('Your core')).toBeTruthy();
    expect(screen.getByText('Now')).toBeTruthy();
  });

  it('shows the exact text passed in, from the design mock', () => {
    render(
      <CoreNudgeCard text="Eat carbs in the next hour and tonight's session will feel easy." />,
    );
    expect(
      screen.getByText("Eat carbs in the next hour and tonight's session will feel easy."),
    ).toBeTruthy();
  });

  it('never hardcodes the nudge copy: renders whatever text its caller passes', () => {
    render(<CoreNudgeCard text="A different nudge, from a different caller." />);
    expect(screen.getByText('A different nudge, from a different caller.')).toBeTruthy();
    expect(
      screen.queryByText("Eat carbs in the next hour and tonight's session will feel easy."),
    ).toBeNull();
  });
});
