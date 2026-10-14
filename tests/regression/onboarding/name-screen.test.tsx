/**
 * Issue #9 — the Name screen (7a·1) passes no `onMicPress` to `VoiceInputBar`, so once
 * `VoiceInputBar` stops rendering a mic button without a real handler (see
 * `foundation/voice-input-bar-mic.test.tsx`), this screen must not show a dead mic button either.
 * The text field + confirm arrow remain the only way to answer.
 */

import { render, screen } from '@testing-library/react-native';

import NameScreen from '@/features/onboarding/screens/NameScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('onboarding: NameScreen has no dead mic button (issue #9)', () => {
  it('does not render a "Voice input" mic button', () => {
    render(<NameScreen />);
    expect(screen.queryByRole('button', { name: 'Voice input' })).toBeNull();
  });

  it('still renders the name text field and confirm button', () => {
    render(<NameScreen />);
    expect(screen.getByPlaceholderText('Type your name')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });

  it('shows the design headline', () => {
    render(<NameScreen />);
    expect(screen.getByText(/What should I/)).toBeTruthy();
    expect(screen.getByText('call you?')).toBeTruthy();
  });
});
