import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { sheetSkyGradient, skyGradient } from '@/shared/theme/tokens';

type SkyBackgroundProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'sheet';
}>;

// This is the shared static daytime atmosphere. Time-aware sky changes remain a later decorative
// enhancement; the direction vector approximates the design's 168deg CSS gradient in React Native.
export function SkyBackground({ children, style, variant = 'default' }: SkyBackgroundProps) {
  const gradient = variant === 'sheet' ? sheetSkyGradient : skyGradient;

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={{ x: 0.4, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
