import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { SkyBackground } from '@/shared/components/SkyBackground';
import { skyGradient } from '@/shared/theme/tokens';

// Issue #53 — one shared sky background replaces the nine hand-written gradients (six wrong
// 2-stop `[zenith, day, air]` arrays ending at #9EC3E8, three `[day, air, sky]` arrays with the
// right angle but the wrong end stop #7FA0C6). The design's actual sky gradient is the
// already-token'd `skyGradient` (day → air → #6F9CCE, locations 0/.48/1) — this component is the
// only place that should ever construct it.
describe('foundation: SkyBackground (issue #53)', () => {
  it("renders the design's exact sky gradient stops and locations", () => {
    render(<SkyBackground />);
    const gradient = screen.UNSAFE_getByType(LinearGradient);
    expect(gradient.props.colors).toEqual(skyGradient.colors);
    expect(gradient.props.locations).toEqual(skyGradient.locations);
  });

  it('uses a diagonal direction vector (168deg approximation), not a plain top-to-bottom default', () => {
    render(<SkyBackground />);
    const gradient = screen.UNSAFE_getByType(LinearGradient);
    expect(gradient.props.start).toEqual({ x: 0.4, y: 0 });
    expect(gradient.props.end).toEqual({ x: 0.6, y: 1 });
  });

  it('renders children inside the gradient, for screens that wrap their whole body in it', () => {
    render(
      <SkyBackground>
        <Text>onboarding content</Text>
      </SkyBackground>,
    );
    expect(screen.getByText('onboarding content')).toBeTruthy();
  });

  it('forwards a style prop, for screens that use it as an absoluteFill sibling', () => {
    render(<SkyBackground style={{ opacity: 1 }} />);
    const gradient = screen.UNSAFE_getByType(LinearGradient);
    expect(StyleSheet.flatten(gradient.props.style)).toMatchObject({
      opacity: 1,
    });
  });
});
