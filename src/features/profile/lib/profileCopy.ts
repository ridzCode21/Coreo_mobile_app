import type { SourceStatus } from '@/features/home';

const dietLabels = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  non_veg: 'Non-veg',
  eggetarian: 'Eggetarian',
  jain: 'Jain',
  keto: 'Keto',
  low_carb: 'Low carb',
  everything: 'Everything',
  no_beef: 'No beef',
  halal: 'Halal',
  pescatarian: 'Pescatarian',
  no_pork: 'No pork',
} as const;
const fitnessGoalLabels = {
  get_stronger: 'Get stronger',
  build_muscle: 'Build muscle',
  lose_fat_keep_muscle: 'Lose fat, keep muscle',
  move_better: 'Move better',
  race_or_event: 'Race or event',
} as const;
const trainingPlaceLabels = {
  full_gym: 'full gym',
  home_dumbbells_band: 'home dumbbells',
  bodyweight: 'bodyweight',
  outdoors: 'outdoors',
} as const;
const sportLabels = {
  cricket: 'cricket',
  football: 'football',
  badminton: 'badminton',
  running: 'running',
  swimming: 'swimming',
  nothing_regular: 'nothing regular',
} as const;
const wellnessFocusLabels = {
  sleep: 'Sleep',
  racing_mind: 'Racing mind',
  work_stress: 'Work stress',
  low_energy: 'Low energy',
  mood_dips: 'Mood dips',
} as const;
const sourceLabels = {
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  strava: 'Strava',
} as const;

function joinParts(parts: (string | null | undefined)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length ? present.join(' · ') : null;
}

export function membershipSummary(createdAt: string, now = new Date()): string {
  const created = new Date(createdAt);
  const days = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86_400_000));
  return `With Coreo since ${created.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} · Week ${Math.floor(days / 7) + 1}`;
}

export function formatGoalSummary(weight: number | null, target: number | null): string | null {
  return weight !== null && target !== null && weight !== target
    ? `${weight} → ${target} kg`
    : null;
}

export function dietPillarSummary(
  dietType: keyof typeof dietLabels | null,
  calories: number,
): string | null {
  return joinParts([
    dietType ? dietLabels[dietType] : null,
    calories > 0 ? `${calories.toLocaleString('en-US')} kcal` : null,
  ]);
}

export function fitnessPillarSummary(
  goal: keyof typeof fitnessGoalLabels | '',
  places: readonly (keyof typeof trainingPlaceLabels)[],
  sports: readonly string[],
): string | null {
  return joinParts([
    goal ? fitnessGoalLabels[goal] : null,
    ...places.map((place) => trainingPlaceLabels[place]),
    ...sports
      .filter((sport): sport is keyof typeof sportLabels => sport in sportLabels)
      .map((sport) => sportLabels[sport]),
  ]);
}

export function wellnessPillarSummary(
  focus: keyof typeof wellnessFocusLabels | '',
  hideNumbers: boolean,
): string | null {
  return joinParts([focus ? wellnessFocusLabels[focus] : null, hideNumbers ? 'no numbers' : null]);
}

export function checkInStyleLabel(style: 'step_in' | 'only_when_i_come' | ''): string | null {
  const labels = {
    step_in: 'Steps in early',
    only_when_i_come: 'Only when I check in',
  } as const;
  return style ? labels[style] : null;
}

export function connectedSourcesSummary(sources: readonly SourceStatus[]): string {
  const labels = sources
    .filter((source) => source.connected)
    .map((source) => sourceLabels[source.source]);
  return labels.length ? labels.join(' · ') : 'Not connected yet';
}

export { sourceLabels };
