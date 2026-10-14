/**
 * Issue #18 — the "Ask me anything" bar (design-spec.md 24b/10a lines 20 / markup lines 94-104 /
 * 207-215): night-glass pill, placeholder text, mic icon, send icon. The issue asks to "Add the
 * 'Ask me anything' bar and connect it to the chat screen when that exists" — no chat screen
 * exists yet anywhere in `src/app/` (assistant is unbuilt, `docs/feature-map.md` Phase 7). Per the
 * hard-stop rule against inventing a navigation target, this bar must not expose a fake
 * interactive affordance that goes nowhere: it renders as a static, non-interactive placeholder
 * (no button role) until a real chat route exists to wire it to.
 */

import { render, screen } from '@testing-library/react-native';

import { AskAnythingBar } from '@/features/home/components/AskAnythingBar';

describe('home: AskAnythingBar (issue #18)', () => {
  it('shows the "Ask me anything" placeholder copy', () => {
    render(<AskAnythingBar />);
    expect(screen.getByText('Ask me anything')).toBeTruthy();
  });

  it('is not interactive yet: no chat screen exists to wire it to', () => {
    render(<AskAnythingBar />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
