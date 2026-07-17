# Design System

**Status: skeleton — to be filled in once the Figma design is available.** This doc will hold
the design tokens and component inventory that `src/shared/theme` and `src/shared/components`
implement. Until populated, follow `.agent/skills/responsive-ui/SKILL.md` and
`AGENTS.md` §8: build with the token architecture below, use neutral placeholder values, and
don't hand-invent a visual identity.

## 1. Tokens (structure now, values later)

Values below are placeholders only, structured so real values can be dropped in without
refactoring call sites.

```ts
// src/shared/theme/tokens.ts (shape — real values come from Figma)
export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  textPrimary: '#111111',
  textSecondary: '#666666',
  primary: '#000000',
  danger: '#CC3333',
  success: '#2E7D32',
  border: '#E0E0E0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
};

export const typography = {
  // font family, weights, and sizes — TODO once Figma type scale is known
};
```

- Components consume tokens via a theme hook/context (`useTheme()`), never import raw hex
  values.
- Support light/dark from day one at the token layer even if only one theme ships first —
  cheaper to build in now than retrofit later.

## 2. Component inventory

_To be filled in from the Figma design._ Expected primitives to land in
`src/shared/components/`: `Screen`, `Text`, `Button`, `Card`, `Input`, `Avatar`, `Badge`,
`ListItem`, plus fitness-specific composites (`WorkoutCard`, `ProgressRing`, etc.) once the
design is available.

For each component, once designed, capture: variants (primary/secondary/destructive), states
(default/pressed/disabled/loading), and responsive behavior.

## 3. Layout & responsiveness baseline

Until specific breakpoints/behavior are defined by the design:

- Design and test against small (iPhone SE-class, ~375pt wide) and large (Pro Max/tablet-class)
  screens at minimum.
- Use flex-based layouts and `useWindowDimensions`/percentage sizing over hardcoded pixel
  widths.
- Respect safe areas on all screens (notches, home indicator, Android status/nav bars).

See `.agent/skills/responsive-ui/SKILL.md` for implementation guidance.

## 4. When the Figma design lands

1. Extract color/spacing/typography tokens first, update §1 with real values.
2. Build/update shared primitives in `src/shared/components` to match, one component at a time.
3. Update §2 with the real component inventory and states.
4. Only then re-skin feature screens to consume the finalized primitives.
