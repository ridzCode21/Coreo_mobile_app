/**
 * Small, pure, cross-feature helpers (formatting, math, etc.) with no React/RN dependency.
 * If a helper needs a hook or component, it belongs in shared/hooks or shared/components
 * instead.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
