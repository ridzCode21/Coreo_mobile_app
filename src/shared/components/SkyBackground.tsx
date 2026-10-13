import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { skyGradient } from '@/shared/theme/tokens';

type SkyBackgroundProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

// This is the shared static daytime atmosphere. Time-aware sky changes remain a later decorative
// enhancement; the direction vector approximates the design's 168deg CSS gradient in React Native.
export function SkyBackground({ children, style }: SkyBackgroundProps) {
  return (
    <LinearGradient
      colors={skyGradient.colors}
      locations={skyGradient.locations}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
