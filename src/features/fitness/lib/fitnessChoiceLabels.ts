import type {
  FitnessGoal,
  ProtectedArea,
  Sport,
  TrainingPlace,
} from '@/shared/types/fitnessProfile';

export const fitnessGoalLabels: Record<FitnessGoal, string> = {
  get_stronger: 'Get stronger',
  build_muscle: 'Build muscle',
  lose_fat_keep_muscle: 'Lose fat, keep muscle',
  move_better: 'Move better, more energy',
  race_or_event: 'A race or event',
};

export const trainingPlaceLabels: Record<TrainingPlace, string> = {
  full_gym: 'A full gym',
  home_dumbbells_band: 'Home, dumbbells and a band',
  bodyweight: 'Just my bodyweight',
  outdoors: 'Outdoors, mostly',
};

export const sportLabels: Record<Sport, string> = {
  cricket: 'Cricket',
  football: 'Football',
  badminton: 'Badminton',
  running: 'Running',
  swimming: 'Swimming',
  nothing_regular: 'Nothing regular',
};

export const protectedAreaLabels: Record<ProtectedArea, string> = {
  lower_back: 'Lower back',
  knees: 'Knees',
  shoulders: 'Shoulders',
  wrists: 'Wrists',
  nothing_to_flag: 'Nothing to flag',
};
