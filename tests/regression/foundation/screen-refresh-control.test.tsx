/**
 * Issue #22 — Diet home needs real pull-to-refresh (current behaviour: the profile error copy
 * promises "Pull to refresh in a moment" but no `RefreshControl` exists anywhere in
 * `src/features/nutrition` or `src/shared/components`). Rather than hand-roll a second scroll
 * container on one screen, the shared `Screen` wrapper (`src/shared/components/Screen.tsx`) gets a
 * generic, optional `refreshControl` passthrough so any screen can opt in. This file protects the
 * passthrough itself and the "untouched when omitted" case, so the ~20 other screens using `Screen`
 * don't regress.
 */

import { RefreshControl, ScrollView, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { Screen } from '@/shared/components/Screen';

describe('shared: Screen refreshControl passthrough (issue #22)', () => {
  it('passes a given refreshControl element to the underlying ScrollView', () => {
    const control = <RefreshControl refreshing={false} onRefresh={() => {}} />;
    const { UNSAFE_getByType } = render(
      <Screen refreshControl={control}>
        <Text>content</Text>
      </Screen>,
    );
    expect(UNSAFE_getByType(ScrollView).props.refreshControl).toBe(control);
  });

  it('leaves the ScrollView without a refreshControl when none is given', () => {
    const { UNSAFE_getByType } = render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(UNSAFE_getByType(ScrollView).props.refreshControl).toBeUndefined();
  });
});
