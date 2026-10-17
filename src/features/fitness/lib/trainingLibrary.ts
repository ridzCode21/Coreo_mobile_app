import type {
  FitnessGoal,
  ProtectedArea,
  Sport,
  TrainingPlace,
} from '@/shared/types/fitnessProfile';

type ExerciseSeed = {
  key: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  superset: string | null;
  progression: string | null;
};

type Place = { gear: string; summary: string; library: LibraryKey };
type LibraryKey = 'full_gym' | 'home_dumbbells_band' | 'bodyweight';

const move = (
  key: string,
  name: string,
  sets: number,
  reps: number,
  weight_kg: number | null = null,
  superset: string | null = null,
  progression: string | null = null,
): ExerciseSeed => ({ key, name, sets, reps, weight_kg, superset, progression });

export const GOALS: Record<FitnessGoal, string> = {
  get_stronger: 'Get stronger',
  build_muscle: 'Build muscle',
  lose_fat_keep_muscle: 'Lose fat, keep muscle',
  move_better: 'Move better, more energy',
  race_or_event: 'A race or event',
};

const AREAS: Partial<Record<ProtectedArea, string>> = {
  lower_back: 'lower back',
  knees: 'knees',
  shoulders: 'shoulders',
  wrists: 'wrists',
};

export const SPORTS: Partial<Record<Sport, string>> = {
  cricket: 'Cricket',
  football: 'Football',
  badminton: 'Badminton',
  running: 'Running',
  swimming: 'Swimming',
};

export const PLACES: Record<TrainingPlace, Place> = {
  full_gym: { gear: 'gym', summary: 'a full gym', library: 'full_gym' },
  home_dumbbells_band: {
    gear: 'dumbbells',
    summary: 'dumbbells at home',
    library: 'home_dumbbells_band',
  },
  bodyweight: { gear: 'bodyweight', summary: 'just bodyweight', library: 'bodyweight' },
  outdoors: { gear: 'outdoors', summary: 'outdoors', library: 'bodyweight' },
};

export const LIFT_DAYS = [
  { key: 'legs', weekday: 1, label: 'monday', name: 'Legs + core' },
  { key: 'push', weekday: 2, label: 'tuesday', name: 'Push: chest, shoulders, arms' },
  { key: 'pull', weekday: 5, label: 'friday', name: 'Pull + hinge' },
] as const;

export const SPORT_WEEKDAY = 7;

const HOME = {
  legs: [
    move('goblet_squat', 'Goblet squat', 4, 8, 16, null, 'Squat'),
    move('dumbbell_romanian_deadlift', 'Dumbbell Romanian deadlift', 3, 8, 14),
    move('reverse_lunge', 'Reverse lunge', 3, 10, 10),
    move('dumbbell_glute_bridge', 'Dumbbell glute bridge', 3, 12, 12),
    move('dumbbell_calf_raise', 'Dumbbell calf raise', 3, 12, 8),
    move('dead_bug', 'Dead bug', 3, 10),
  ],
  push: [
    move('dumbbell_bench_press', 'Dumbbell bench press', 4, 8, 17.5, null, 'Bench'),
    move('seated_shoulder_press', 'Seated shoulder press', 3, 10, 10),
    move('incline_fly', 'Incline fly', 3, 12, 5),
    move('overhead_triceps', 'Overhead triceps', 3, 12, null, 'arms'),
    move('curls', 'Curls', 3, 12, null, 'arms'),
  ],
  pull: [
    move('one_arm_dumbbell_row', 'One-arm dumbbell row', 4, 8, 12, null, 'Row'),
    move('chest_supported_dumbbell_row', 'Chest-supported dumbbell row', 3, 10, 12),
    move('face_pull', 'Face pull', 3, 12),
    move('band_pull_apart', 'Band pull-apart', 3, 15),
    move('dumbbell_romanian_deadlift', 'Dumbbell Romanian deadlift', 3, 8, 16),
    move('farmer_carry', 'Farmer carry', 3, 12, 10),
  ],
};

const GYM = {
  legs: [
    move('barbell_back_squat', 'Barbell back squat', 4, 8, 40, null, 'Squat'),
    move('barbell_romanian_deadlift', 'Barbell Romanian deadlift', 3, 8, 40),
    move('walking_lunge', 'Walking lunge', 3, 10, 14),
    move('leg_curl', 'Leg curl', 3, 12, 20),
    move('standing_calf_raise', 'Standing calf raise', 3, 12, 20),
    move('dead_bug', 'Dead bug', 3, 10),
  ],
  push: [
    move('barbell_bench_press', 'Barbell bench press', 4, 8, 40, null, 'Bench'),
    move('seated_dumbbell_shoulder_press', 'Seated dumbbell shoulder press', 3, 10, 14),
    move('incline_dumbbell_fly', 'Incline dumbbell fly', 3, 12, 8),
    move('overhead_triceps', 'Overhead triceps', 3, 12, null, 'arms'),
    move('barbell_curl', 'Barbell curl', 3, 12, 15, 'arms'),
  ],
  pull: [
    move('chest_supported_row', 'Chest-supported row', 4, 8, 25, null, 'Row'),
    move('lat_pulldown', 'Lat pulldown', 3, 10, 30),
    move('face_pull', 'Face pull', 3, 12),
    move('straight_arm_pulldown', 'Straight-arm pulldown', 3, 12, 15),
    move('barbell_romanian_deadlift', 'Barbell Romanian deadlift', 3, 8, 40),
    move('farmer_carry', 'Farmer carry', 3, 12, 16),
  ],
};

const BODY = {
  legs: [
    move('squat', 'Squat', 4, 8),
    move('glute_bridge', 'Glute bridge', 3, 10),
    move('reverse_lunge', 'Reverse lunge', 3, 10),
    move('calf_raise', 'Calf raise', 3, 12),
    move('dead_bug', 'Dead bug', 3, 10),
    move('side_plank', 'Side plank', 3, 10),
  ],
  push: [
    move('push_up', 'Push-up', 4, 8),
    move('pike_push_up', 'Pike push-up', 3, 10),
    move('incline_push_up', 'Incline push-up', 3, 12),
    move('chair_dip', 'Chair dip', 3, 12, null, 'arms'),
    move('diamond_push_up', 'Diamond push-up', 3, 12, null, 'arms'),
  ],
  pull: [
    move('inverted_row', 'Inverted row', 4, 8),
    move('doorway_row', 'Doorway row', 3, 10),
    move('prone_y_raise', 'Prone Y raise', 3, 12),
    move('backpack_row', 'Backpack row', 3, 12),
    move('hip_hinge', 'Hip hinge', 3, 8),
    move('bird_dog', 'Bird dog', 3, 10),
  ],
};

export const LIBRARY = {
  legs: { home_dumbbells_band: HOME.legs, full_gym: GYM.legs, bodyweight: BODY.legs },
  push: { home_dumbbells_band: HOME.push, full_gym: GYM.push, bodyweight: BODY.push },
  pull: { home_dumbbells_band: HOME.pull, full_gym: GYM.pull, bodyweight: BODY.pull },
};

const SWAPS: Record<string, Partial<ExerciseSeed>> = {
  'goblet_squat:knees': { key: 'box_squat', name: 'Box squat' },
  'barbell_back_squat:knees': { key: 'box_squat', name: 'Box squat' },
  'squat:knees': { key: 'box_squat', name: 'Box squat' },
  'reverse_lunge:knees': { key: 'step_up', name: 'Step-up' },
  'walking_lunge:knees': { key: 'step_up', name: 'Step-up' },
  'dumbbell_romanian_deadlift:lower_back': {
    key: 'back_safe_hip_hinge',
    name: 'Back-safe hip hinge',
  },
  'barbell_romanian_deadlift:lower_back': {
    key: 'back_safe_hip_hinge',
    name: 'Back-safe hip hinge',
  },
  'seated_shoulder_press:shoulders': { key: 'floor_press', name: 'Floor press' },
  'seated_dumbbell_shoulder_press:shoulders': { key: 'floor_press', name: 'Floor press' },
  'pike_push_up:shoulders': { key: 'knee_push_up', name: 'Knee push-up' },
  'dumbbell_bench_press:wrists': {
    key: 'neutral_grip_dumbbell_press',
    name: 'Neutral-grip dumbbell press',
    progression: 'Press',
  },
  'barbell_bench_press:wrists': {
    key: 'neutral_grip_dumbbell_press',
    name: 'Neutral-grip dumbbell press',
    progression: 'Press',
  },
  'push_up:wrists': { key: 'fist_push_up', name: 'Fist push-up', progression: 'Press' },
};

export function resolvePlace(places: TrainingPlace[]): Place {
  return places.map((place) => PLACES[place]).find(Boolean) ?? PLACES.bodyweight;
}

export function firstSport(sports: Sport[]): [Sport | null, string | null] {
  for (const sport of sports) {
    const name = SPORTS[sport];
    if (name) return [sport, name];
  }
  return [null, null];
}

export function protectedClause(areas: ProtectedArea[]): string | null {
  const words = areas.map((area) => AREAS[area]).filter((word): word is string => Boolean(word));
  if (words.length === 0) return null;
  if (words.length === 1) return `${words[0]} protected`;
  if (words.length === 2) return `${words[0]} and ${words[1]} protected`;
  return `${words.slice(0, -1).join(', ')}, and ${words.at(-1)} protected`;
}

export function liftName(key: 'legs' | 'push' | 'pull', areas: ProtectedArea[]): string {
  if (key === 'pull' && areas.includes('lower_back')) return 'Pull + hinge, back-safe';
  return LIFT_DAYS.find((day) => day.key === key)?.name ?? key;
}

export function movements(key: 'legs' | 'push' | 'pull', library: LibraryKey): ExerciseSeed[] {
  return LIBRARY[key][library].map((exercise) => ({ ...exercise }));
}

export function applySwap(exercise: ExerciseSeed, areas: ProtectedArea[]): ExerciseSeed {
  for (const area of areas) {
    const replacement = SWAPS[`${exercise.key}:${area}`];
    if (replacement) return { ...exercise, ...replacement };
  }
  return exercise;
}
