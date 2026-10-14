import { StyleSheet, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { LabeledField } from '@/shared/components/LabeledField';
import { radii } from '@/shared/theme/tokens';

function clipViewOf(root: ReturnType<typeof render>) {
  return root.UNSAFE_getAllByType(View).find((node) => {
    const flat = StyleSheet.flatten(node.props.style);
    return flat && typeof flat.borderColor === 'string';
  });
}

/**
 * Issue #14 — 8e "Create your account" and 8b "Sign in with email" both use the design's
 * labelled-glass-box field (9px uppercase label, 13px value, 18px radius) three times between
 * them. Built once here rather than per-screen (docs/design-system.md §7).
 */
describe('foundation: LabeledField (issue #14)', () => {
  it('shows the uppercase label and the placeholder', () => {
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('calls onChangeText as the user types', () => {
    const onChangeText = jest.fn();
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={onChangeText}
      />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'maya@example.com');
    expect(onChangeText).toHaveBeenCalledWith('maya@example.com');
  });

  it('renders the current value', () => {
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value="maya@example.com"
        onChangeText={jest.fn()}
      />,
    );
    expect(screen.getByDisplayValue('maya@example.com')).toBeTruthy();
  });

  it('masks the input when secureTextEntry is set (Password / Confirm password)', () => {
    render(
      <LabeledField
        label="Password"
        placeholder="Password"
        value="quiet-harbor-42"
        onChangeText={jest.fn()}
        secureTextEntry
      />,
    );
    expect(screen.getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
  });

  it('does not mask the input by default (Email)', () => {
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('you@example.com').props.secureTextEntry).toBeFalsy();
  });

  it('uses the 18px compact input-row radius (radii.control), matching the design exactly', () => {
    const root = render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    const clip = clipViewOf(root);
    expect(clip).toBeDefined();
    expect(StyleSheet.flatten(clip!.props.style).borderRadius).toBe(radii.control);
  });

  it('pads the field with the 15/18px field-padding tokens, not the GlassCard 20px default', () => {
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    const content = screen.getByTestId('glass-card-content');
    const flat = StyleSheet.flatten(content.props.style);
    expect(flat.paddingVertical).toBe(15);
    expect(flat.paddingHorizontal).toBe(18);
  });

  it('exposes an accessible label for assistive tech, falling back to the visible label', () => {
    render(
      <LabeledField
        label="Email"
        placeholder="you@example.com"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });
});
