/**
 * Issue #9 — `VoiceInputBar`'s mic button always rendered even when no caller passed
 * `onMicPress`, so pressing it silently did nothing (NameScreen never wires a handler, since
 * there's no real speech-to-text yet — docs/design-system.md §9). A button that does nothing on
 * press is a dead button; the fix is to render the mic only when a real handler is given.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';

import { VoiceInputBar } from '@/shared/components/VoiceInputBar';

describe('foundation: VoiceInputBar never shows a dead mic button (issue #9)', () => {
  it('does not render a mic button when no onMicPress handler is given', () => {
    render(
      <VoiceInputBar value="" onChangeText={() => {}} placeholder="Type" onSubmit={() => {}} />,
    );

    expect(screen.queryByRole('button', { name: 'Voice input' })).toBeNull();
  });

  it('renders a working mic button when a real onMicPress handler is given', () => {
    const onMicPress = jest.fn();
    render(
      <VoiceInputBar
        value=""
        onChangeText={() => {}}
        placeholder="Type"
        onSubmit={() => {}}
        onMicPress={onMicPress}
      />,
    );

    const mic = screen.getByRole('button', { name: 'Voice input' });
    fireEvent.press(mic);
    expect(onMicPress).toHaveBeenCalledTimes(1);
  });

  it('still renders the confirm button regardless of onMicPress', () => {
    render(
      <VoiceInputBar value="hi" onChangeText={() => {}} placeholder="Type" onSubmit={() => {}} />,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy();
  });
});
