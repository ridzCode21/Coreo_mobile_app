import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { GlassCard } from '@/shared/components/GlassCard';
import { colors, radii, spacing, textStyle, withAlpha } from '@/shared/theme/tokens';

type VoiceInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
  /** Omit until the caller has a real voice-input action; dead affordances must not render. */
  onMicPress?: () => void;
  autoFocus?: boolean;
  style?: ViewStyle;
};

/**
 * Night-glass input pill used across onboarding — docs/design-system.md §7 `VoiceInputBar`. The
 * text field + confirm arrow are always available; the mic appears only when voice input is wired.
 */
export function VoiceInputBar({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  submitDisabled = false,
  onMicPress,
  autoFocus,
  style,
}: VoiceInputBarProps) {
  return (
    <GlassCard variant="night" radius={radii.pill} padded={false} style={style}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={withAlpha(colors.fog, 0.55)}
          style={styles.input}
          autoFocus={autoFocus}
          onSubmitEditing={submitDisabled ? undefined : onSubmit}
          returnKeyType="done"
        />
        {onMicPress ? (
          <Pressable
            onPress={onMicPress}
            accessibilityRole="button"
            accessibilityLabel="Voice input"
            style={styles.micButton}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Rect
                x={9}
                y={3}
                width={6}
                height={11}
                rx={3}
                stroke={colors.onNight}
                strokeWidth={1.8}
              />
              <Path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke={colors.onNight}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onSubmit}
          disabled={submitDisabled}
          accessibilityRole="button"
          accessibilityLabel="Confirm"
          style={[styles.confirmButton, submitDisabled && styles.confirmDisabled]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 19V5M6 11l6-6 6 6"
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    gap: spacing.sm,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...textStyle('body'),
    color: colors.onNight,
    padding: 0,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.white, 0.14),
    borderWidth: 1,
    borderColor: withAlpha(colors.white, 0.3),
  },
  confirmButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  confirmDisabled: {
    opacity: 0.4,
  },
});
