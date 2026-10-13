# Regression suite index

One row per test file. Run everything with `npm run test:regression` (see `../README.md`).

| Test file                             | Feature    | Protects                                                                                         | Issue | Added      |
| ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ | ----- | ---------- |
| `foundation/theme-tokens.test.ts`     | foundation | Ink colour token, no red tokens, positive spacing and radius scales                              | setup | 2026-10-13 |
| `foundation/selectable-chip.test.tsx` | foundation | Chip renders its label, exposes selected state, calls `onPress`                                  | setup | 2026-10-13 |
| `nutrition/macros.test.ts`            | nutrition  | Remaining macros (negative allowed), fill ratio clamp, zero for missing values, per-100g scaling | setup | 2026-10-13 |
