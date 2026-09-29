import { Tabs, type Href, useRouter, useSegments } from 'expo-router';

import {
  BottomDock,
  type BottomDockRouteName,
  type BottomDockItem,
} from '@/shared/components/BottomDock';

const LABELS: Record<BottomDockRouteName, string> = {
  diet: 'Diet',
  fitness: 'Fitness',
  wellness: 'Wellness',
  core: 'Coreo',
};

const DOCK_ROUTES: BottomDockRouteName[] = ['diet', 'fitness', 'wellness', 'core'];

const DOCK_HREFS: Record<BottomDockRouteName, Href> = {
  diet: '/diet',
  fitness: '/fitness',
  wellness: '/wellness',
  core: '/core',
};

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hideDock = (segments as readonly string[]).includes('scan');

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        if (hideDock) return null;
        const focusedRoute = props.state.routes[props.state.index]?.name;
        const items: BottomDockItem[] = DOCK_ROUTES.map((name) => ({
          name,
          label: LABELS[name],
          active: focusedRoute === name || (focusedRoute === 'coreo' && name === 'core'),
          // Navigate by Expo Router href, not React Navigation's internal screen name. The
          // latter can be absent from the current tab navigator state for file-system routes,
          // producing "NAVIGATE ... was not handled" even though `/core` exists.
          onPress: () => router.navigate(DOCK_HREFS[name]),
        }));
        return <BottomDock items={items} />;
      }}
    >
      <Tabs.Screen name="diet" />
      <Tabs.Screen name="fitness" />
      <Tabs.Screen name="wellness" />
      <Tabs.Screen name="core" />
      <Tabs.Screen name="coreo" options={{ href: null }} />
    </Tabs>
  );
}
