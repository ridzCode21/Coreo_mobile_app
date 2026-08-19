// TEMPORARY app landing (design spec F-N3): the Diet pillar is the entry point for now, until the
// petal-cluster Home (Phase 4, design-system.md §8) is built. Swap this single re-export for the
// Home screen when it lands — no other change needed. Sign-out isn't surfaced here yet; it belongs
// to the Profile screen (Phase 7).
export { DietHomeScreen as default } from '@/features/nutrition';
