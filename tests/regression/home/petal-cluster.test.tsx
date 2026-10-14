/**
 * Issue #17 — pillar petals. The design (24b/10a, 2x2 grid) orders them Wellness (top-left),
 * Fitness (top-right), Diet (bottom-left), Core (bottom-right, brighter + weight 500), labels
 * only. Pre-fix the cluster was ordered Diet, Fitness, Wellness, Coreo with a value line under
 * each label ("kcal", "Logged", "Open") and a "Coreo" petal that linked to `/core` — the screen
 * the user is already on (issue current-behavior, `CoreoHomeScreen.tsx:210-235`).
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { PetalCluster, type PetalClusterItem } from '@/shared/components/PetalCluster';

function renderCluster(onPress: Record<string, jest.Mock>) {
  const items: PetalClusterItem[] = [
    { id: 'wellness', label: 'Wellness', onPress: onPress.wellness },
    { id: 'fitness', label: 'Fitness', onPress: onPress.fitness },
    { id: 'diet', label: 'Diet', onPress: onPress.diet },
    { id: 'core', label: 'Core', emphasized: true },
  ];
  return render(<PetalCluster items={items} />);
}

describe('home: PetalCluster', () => {
  it('renders exactly the four pillar labels, nothing else (no values like "kcal"/"Logged"/"Open")', () => {
    renderCluster({ wellness: jest.fn(), fitness: jest.fn(), diet: jest.fn() });
    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('Fitness')).toBeTruthy();
    expect(screen.getByText('Diet')).toBeTruthy();
    expect(screen.getByText('Core')).toBeTruthy();
    expect(screen.queryByText(/kcal/i)).toBeNull();
    expect(screen.queryByText('Logged')).toBeNull();
    expect(screen.queryByText('Ready')).toBeNull();
    expect(screen.queryByText('Open')).toBeNull();
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('renders the petals in design order Wellness, Fitness, Diet, Core (not Diet, Fitness, Wellness, Coreo)', () => {
    renderCluster({ wellness: jest.fn(), fitness: jest.fn(), diet: jest.fn() });
    // Order check via the accessible button sequence (Core has no button role, see below).
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual(['Wellness', 'Fitness', 'Diet']);
  });

  it("calls the pillar's onPress when tapped", () => {
    const onPress = { wellness: jest.fn(), fitness: jest.fn(), diet: jest.fn() };
    renderCluster(onPress);
    fireEvent.press(screen.getByText('Wellness'));
    expect(onPress.wellness).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Diet'));
    expect(onPress.diet).toHaveBeenCalledTimes(1);
  });

  it('renders Core as not a link (no button role) since it would navigate to the screen the user is already on', () => {
    renderCluster({ wellness: jest.fn(), fitness: jest.fn(), diet: jest.fn() });
    expect(screen.queryByRole('button', { name: 'Core' })).toBeNull();
  });
});
