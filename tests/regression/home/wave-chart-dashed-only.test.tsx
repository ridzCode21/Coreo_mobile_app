/**
 * Issue #19 — the calibrating home (days 1-3) needs a fully dashed wave with no solid portion and
 * no glow dot ("the wave stays dashed until day 4"), per design lines 4291-4292:
 * `stroke-dasharray: 3 7`, opacity `.35`, stroke width `2` — distinct from the existing
 * solid/dashed-split mode's `5,7` dasharray at `.45`/width `2.5` (`WaveChart.tsx:135-139`). This adds
 * one boolean prop, `dashedOnly`, to the existing shared `WaveChart` rather than a new component.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { Circle, Path } from 'react-native-svg';

import { WaveChart } from '@/shared/components/WaveChart';

function layoutWidth(view: ReturnType<typeof render>, width: number) {
  const wrap = view.UNSAFE_getByType(View);
  fireEvent(wrap, 'layout', {
    nativeEvent: { layout: { width, height: 56, x: 0, y: 0 } },
  });
}

describe('shared: WaveChart dashedOnly mode (issue #19)', () => {
  it('renders exactly one dashed path (3,7 / opacity .35 / width 2) and no dot', () => {
    const view = render(<WaveChart dashedOnly color="#F0F4F8" />);
    layoutWidth(view, 300);

    const paths = view.UNSAFE_getAllByType(Path);
    expect(paths).toHaveLength(1);
    expect(paths[0].props.strokeDasharray).toBe('3,7');
    expect(paths[0].props.opacity).toBe(0.35);
    expect(paths[0].props.strokeWidth).toBe(2);
    expect(paths[0].props.stroke).toBe('#F0F4F8');

    expect(view.UNSAFE_queryAllByType(Circle)).toHaveLength(0);
  });

  it('does not render any path before a width has been measured', () => {
    const view = render(<WaveChart dashedOnly color="#F0F4F8" />);
    expect(view.UNSAFE_queryAllByType(Path)).toHaveLength(0);
  });

  it('default (non-dashedOnly) mode is unaffected: still renders the dot and the 5,7 dashed backdrop', () => {
    const view = render(<WaveChart progress={0.5} />);
    layoutWidth(view, 300);

    const paths = view.UNSAFE_getAllByType(Path);
    expect(paths.some((p) => p.props.strokeDasharray === '5,7')).toBe(true);
    expect(view.UNSAFE_getAllByType(Circle).length).toBeGreaterThan(0);
  });
});
