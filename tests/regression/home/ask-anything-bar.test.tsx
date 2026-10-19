/**
 * Issue #18 built the "Ask me anything" bar as a deliberately non-interactive placeholder, because
 * no chat screen existed yet to wire it to (`design-spec.md` 24b/10a). Issue #43 built that screen
 * (`/chat-presence`, `src/app/(app)/chat-presence.tsx`), so this now wires the bar to it. This file
 * replaces the old "no button role" assertion with the new navigation behavior.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { AskAnythingBar } from '@/features/home/components/AskAnythingBar';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('home: AskAnythingBar (issue #18, wired by #43)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the "Ask me anything" placeholder copy', () => {
    render(<AskAnythingBar />);
    expect(screen.getByText('Ask me anything')).toBeTruthy();
  });

  it('is now a button that opens the chat presence screen', () => {
    render(<AskAnythingBar />);
    fireEvent.press(screen.getByRole('button', { name: 'Ask me anything' }));
    expect(mockPush).toHaveBeenCalledWith('/chat-presence');
  });
});
