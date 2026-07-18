import { useWindowDimensions } from 'react-native';

/**
 * Central breakpoint/orientation source — see docs/design-system.md §11.4. Components that need
 * to adapt layout should derive their mode from this hook instead of independently querying
 * dimensions and re-deriving the same breakpoint logic.
 */
export type Breakpoint = 'compact' | 'base' | 'large' | 'tablet';
export type Orientation = 'portrait' | 'landscape';

export type Responsive = {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  orientation: Orientation;
  /** Recommended max width for constrained, centered content (see design-system.md §11.2). */
  contentMaxWidth: number;
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= 768) return 'tablet';
  if (width >= 430) return 'large';
  if (width >= 380) return 'base';
  return 'compact';
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';
  const breakpoint = getBreakpoint(Math.min(width, height));

  const contentMaxWidth = breakpoint === 'tablet' ? 560 : width;

  return { width, height, breakpoint, orientation, contentMaxWidth };
}
