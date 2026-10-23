/**
 * Issue #49 (design 25c) — the offline wave must not draw past the saved time. `pastOnly` removes
 * the dashed "projected" remainder and leaves only a faint flat dotted line from the boundary.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { Path } from 'react-native-svg';

import { WaveChart } from '@/shared/components/WaveChart';

function layoutWidth(view: ReturnType<typeof render>, width: number) {
  fireEvent(view.UNSAFE_getByType(View), 'layout', {
    nativeEvent: { layout: { width, height: 56, x: 0, y: 0 } },
  });
}

describe('shared: WaveChart pastOnly mode (issue #49)', () => {
  it('draws no dashed wave remainder, only a flat faint dotted line from the boundary', () => {
    const view = render(<WaveChart pastOnly progress={0.5} color="#FFFFFF" />);
    layoutWidth(view, 300);

    const paths = view.UNSAFE_getAllByType(Path);
    const dashedRemainders = paths.filter((path) => path.props.strokeDasharray === '5,7');
    expect(dashedRemainders).toHaveLength(0);

    const flat = view.getByTestId('wave-past-only-flat-line');
    expect([flat.props.strokeDasharray].flat().join(',')).toBe('2,8');
    expect(flat.props.opacity).toBe(0.16);
    // Starts at the boundary (half of 300) and runs flat (same y at both ends) to the edge.
    const match = /^M150\.00 ([\d.-]+) L300\.00 ([\d.-]+)$/.exec(flat.props.d);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(match?.[2]);
  });

  it('keeps the normal dashed remainder when pastOnly is off', () => {
    const view = render(<WaveChart progress={0.5} color="#FFFFFF" />);
    layoutWidth(view, 300);
    const paths = view.UNSAFE_getAllByType(Path);
    expect(paths.some((path) => path.props.strokeDasharray === '5,7')).toBe(true);
    expect(view.queryByTestId('wave-past-only-flat-line')).toBeNull();
  });
});
