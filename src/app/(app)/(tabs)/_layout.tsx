import { Tabs, useSegments } from 'expo-router';

import {
  BottomDock,
  type BottomDockRouteName,
  type BottomDockItem,
} from '@/shared/components/BottomDock';

const LABELS: Record<BottomDockRouteName, string> = {
  diet: 'Diet',
  fitness: 'Fitness',
  wellness: 'Wellness',
  coreo: 'Coreo',
};

function isDockRoute(name: string): name is BottomDockRouteName {
  return name === 'diet' || name === 'fitness' || name === 'wellness' || name === 'coreo';
}

export default function TabsLayout() {
  const segments = useSegments();
  const hideDock = (segments as readonly string[]).includes('scan');

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        if (hideDock) return null;
        const focusedKey = props.state.routes[props.state.index]?.key;
        const items: BottomDockItem[] = props.state.routes.reduce<BottomDockItem[]>(
          (acc, route) => {
            if (!isDockRoute(route.name)) return acc;
            acc.push({
              name: route.name,
              label: LABELS[route.name],
              active: focusedKey === route.key,
              onPress: () => props.navigation.navigate(route.name),
            });
            return acc;
          },
          [],
        );
        return <BottomDock items={items} />;
      }}
    >
      <Tabs.Screen name="diet" />
      <Tabs.Screen name="fitness" />
      <Tabs.Screen name="wellness" />
      <Tabs.Screen name="coreo" />
    </Tabs>
  );
}
