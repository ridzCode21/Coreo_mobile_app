---
name: responsive-ui
description: >-
  Build screens and components that adapt correctly across phone sizes, both platforms, and
  light/dark, using design tokens rather than hardcoded values. Use whenever building or
  modifying any screen or UI component.
disable-model-invocation: true
---

# Responsive UI

Design tokens/components reference: [`docs/design-system.md`](../../../docs/design-system.md)
(currently a skeleton — see below for how to build ahead of it).

## Instructions

1. **Always go through tokens, never raw values.** Colors, spacing, radii, and type sizes come
   from `useTheme()`/the tokens module, not inline hex codes or magic numbers. If
   `docs/design-system.md` doesn't have a real value yet, use the placeholder token (already
   structured there) rather than inventing a one-off value in the component — this keeps the
   later re-skin a token-file edit, not a component rewrite.
2. **Layout with flex, not fixed pixels.** Use `flex`, `%`, and `useWindowDimensions()` instead
   of hardcoded widths/heights, except for genuinely fixed-size elements (icons, avatars).
3. **Safe areas everywhere.** Wrap screens with `SafeAreaView`/`useSafeAreaInsets` from
   `react-native-safe-area-context` — never hardcode top/bottom offsets for notches or the
   Android nav bar.
4. **Test against two extremes mentally (or in simulator when possible):** a small phone
   (~375pt wide, e.g. iPhone SE) and a large one (Pro Max/tablet-class). Text shouldn't clip,
   buttons shouldn't overflow, scrollable content should scroll rather than get cut off.
5. **Platform divergence is explicit, not accidental.** If iOS and Android genuinely need
   different behavior (e.g. shadow vs. elevation, haptics, modal presentation), use
   `Platform.select`/`.ios.tsx`/`.android.tsx` deliberately — don't let it happen by accident
   via an untested platform-specific API.
6. **Accessibility is part of "responsive," not an afterthought.** Every interactive element
   gets `accessibilityLabel`/`accessibilityRole`; tap targets meet the ~44x44pt minimum; text
   respects Dynamic Type / font scaling (avoid disabling font scaling unless there's a specific
   layout reason, and note it if you do).
7. **Loading/empty/error states are part of the UI, not just the data layer.** Every
   query-backed screen needs a designed (even if simple/placeholder) state for each, not just the
   happy path.

## Landscape and tablet — concrete rules

`docs/design-system.md` §11 has the full spec (phone-size variance, tablet strategy, landscape
reflow rules, and the `useResponsive()` implementation pattern) — read it before building any
screen, not just this summary:

- Every screen must be scrollable by default, never a fixed-height `flex` layout that assumes a
  tall portrait viewport — that's the first thing that breaks in landscape or on a short phone.
- Onboarding-style (question + input stacked) and the presence/chat screen must reflow to a
  left/right split in landscape, driven by `useWindowDimensions()`/the shared `useResponsive()`
  hook — not a fixed per-device check.
- Tablet: constrain and center content (don't stretch cards edge-to-edge); only build a real
  multi-pane layout for specific screens where it clearly helps (see design-system.md §11.2).
- Decorative/ambient background elements must be sized relative to the container, never
  fixed-pixel for a single reference device size.
- Decide and state each screen's orientation policy explicitly (portrait-locked vs. rotatable) —
  don't leave it implicit.

## Design tokens are populated — use them, don't invent

`docs/design-system.md` now has real colors, typography, spacing/radius scales, and the "liquid
glass" material recipe (light + dark glass, with an explicit React Native implementation
approach using `expo-blur` + `expo-linear-gradient` + platform shadow/elevation). Build against
those tokens and the shared `GlassCard` primitive — if a screen needs a value that isn't in the
doc, add it to the doc first rather than hardcoding a one-off.
