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

## When design-system tokens are still placeholders

Build the real layout/structure now using the placeholder tokens from
`docs/design-system.md`. Don't block feature work on the final visual design — the token
indirection means swapping in real values later touches one file, not every screen.
