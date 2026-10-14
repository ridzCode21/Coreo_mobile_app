/**
 * Issue #9 — every interview step's header (progress dots → wave glyph + title) used
 * `spacing.xl` (20px) between the dots and the title group; design file lines 211-306 (7a·1-7a·3)
 * put 56px there (the `margin-top:56px` wrapper around the svg+title). The top padding before the
 * dots (`insets.top + spacing.xl`) already approximates the design's fixed 76px on the design's
 * reference device while staying safe-area-correct on other devices, so that part is unchanged —
 * only the 56px header gap was wrong.
 */

import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { OnboardingStepScaffold } from '@/features/onboarding/components/OnboardingStepScaffold';
import { spacing } from '@/shared/theme/tokens';

describe('onboarding: step scaffold header spacing matches the design (issue #9)', () => {
  it('puts 56px between the progress dots and the wave+title group', () => {
    render(
      <OnboardingStepScaffold
        progress={{ index: 0, total: 5 }}
        title={<Text>Title</Text>}
        footer={<Text>Footer</Text>}
      />,
    );

    const header = screen.getByTestId('onboarding-step-header');
    expect(StyleSheet.flatten(header.props.style).marginTop).toBe(56);
  });

  it('keeps 56px as a named token, not a magic number', () => {
    expect(spacing.stepHeaderGap).toBe(56);
  });
});
