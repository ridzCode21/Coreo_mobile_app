import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { NextBar, OnboardingStepScaffold, onboardingTitleStyles } from '@/features/onboarding';
import { GoalStep } from '@/features/fitness/components/steps/GoalStep';
import { MovementStep } from '@/features/fitness/components/steps/MovementStep';
import { PlaceStep } from '@/features/fitness/components/steps/PlaceStep';
import { ProtectStep } from '@/features/fitness/components/steps/ProtectStep';
import { SportsStep } from '@/features/fitness/components/steps/SportsStep';
import {
  useFitnessProfileQuery,
  useUpdateFitnessProfileMutation,
} from '@/features/fitness/api/fitnessProfileApi';
import { Screen } from '@/shared/components/Screen';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import type {
  FitnessGoal,
  FitnessProfile,
  FitnessProfilePatch,
  ProtectedArea,
  Sport,
  TrainingPlace,
} from '@/shared/types/fitnessProfile';

const FITNESS_ROUTE = '/fitness' as Href;

type InterviewAnswers = Pick<
  FitnessProfile,
  'fitness_goal' | 'training_places' | 'movement_note' | 'sports' | 'protected_areas'
>;

const EMPTY_ANSWERS: InterviewAnswers = {
  fitness_goal: '',
  training_places: [],
  movement_note: '',
  sports: [],
  protected_areas: [],
};

export default function FitnessInterviewScreen() {
  const router = useRouter();
  const profileQuery = useFitnessProfileQuery();
  const updateProfile = useUpdateFitnessProfileMutation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<InterviewAnswers>(() =>
    profileQuery.data ? answersFromProfile(profileQuery.data) : EMPTY_ANSWERS,
  );
  const hydrated = useRef(Boolean(profileQuery.data));

  useEffect(() => {
    if (!hydrated.current && profileQuery.data) {
      setAnswers(answersFromProfile(profileQuery.data));
      hydrated.current = true;
    }
  }, [profileQuery.data]);

  if (profileQuery.isLoading || (!profileQuery.data && !profileQuery.isError)) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading fitness interview" />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.stateScreen}>
        <Text style={styles.stateText}>Something went wrong. Try again.</Text>
      </Screen>
    );
  }

  const submit = (patch: FitnessProfilePatch) => {
    updateProfile.mutate(patch, {
      onSuccess: () => {
        if (step === 4) router.replace(FITNESS_ROUTE);
        else setStep((current) => current + 1);
      },
    });
  };

  const stepConfig = getStepConfig(step, answers, setAnswers);

  return (
    <OnboardingStepScaffold
      compactPaddingX
      progress={{ index: step, total: 5 }}
      title={<Text style={onboardingTitleStyles.compact}>{stepConfig.title}</Text>}
      footer={
        <View>
          <NextBar
            label={stepConfig.footerLabel}
            onPress={() => submit(stepConfig.patch)}
            disabled={!stepConfig.canAdvance || updateProfile.isPending}
          />
          {updateProfile.isError ? (
            <Text accessibilityRole="alert" style={styles.submitError}>
              {"I couldn't save that just now. Try again."}
            </Text>
          ) : null}
        </View>
      }
    >
      {stepConfig.body}
    </OnboardingStepScaffold>
  );
}

function answersFromProfile(profile: FitnessProfile): InterviewAnswers {
  return {
    fitness_goal: profile.fitness_goal,
    training_places: [...profile.training_places],
    movement_note: profile.movement_note,
    sports: [...profile.sports],
    protected_areas: [...profile.protected_areas],
  };
}

type StepConfig = {
  title: ReactNode;
  body: ReactNode;
  footerLabel: string;
  canAdvance: boolean;
  patch: FitnessProfilePatch;
};

function getStepConfig(
  step: number,
  answers: InterviewAnswers,
  setAnswers: Dispatch<SetStateAction<InterviewAnswers>>,
): StepConfig {
  if (step === 0) {
    return {
      title: 'What are we building?',
      body: (
        <GoalStep
          value={answers.fitness_goal}
          onChange={(fitness_goal: FitnessGoal) =>
            setAnswers((current) => ({ ...current, fitness_goal }))
          }
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.fitness_goal !== '',
      patch: { fitness_goal: answers.fitness_goal },
    };
  }

  if (step === 1) {
    return {
      title: 'Where will this actually happen? I only build with what you have.',
      body: (
        <PlaceStep
          value={answers.training_places}
          onChange={(training_places: TrainingPlace[]) =>
            setAnswers((current) => ({ ...current, training_places }))
          }
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.training_places.length > 0,
      patch: { training_places: answers.training_places },
    };
  }

  if (step === 2) {
    return {
      title: 'Tell me what moving looks like now. A normal week, gym or not, all of it counts.',
      body: (
        <MovementStep
          value={answers.movement_note}
          onChange={(movement_note: string) =>
            setAnswers((current) => ({ ...current, movement_note }))
          }
        />
      ),
      footerLabel: "Keep going. I've got it",
      canAdvance: true,
      patch: { movement_note: answers.movement_note.trim() },
    };
  }

  if (step === 3) {
    return {
      title: (
        <>
          Do you play anything?{' '}
          <Text style={onboardingTitleStyles.emphasis}>Sport counts as training.</Text>
        </>
      ),
      body: (
        <SportsStep
          value={answers.sports}
          onChange={(sports: Sport[]) => setAnswers((current) => ({ ...current, sports }))}
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.sports.length > 0,
      patch: { sports: answers.sports },
    };
  }

  return {
    title:
      'Last one. Anything we train around? Old injuries, cranky joints, I never program into pain.',
    body: (
      <ProtectStep
        value={answers.protected_areas}
        onChange={(protected_areas: ProtectedArea[]) =>
          setAnswers((current) => ({ ...current, protected_areas }))
        }
      />
    ),
    footerLabel: 'Build my training week',
    canAdvance: answers.protected_areas.length > 0,
    patch: { protected_areas: answers.protected_areas },
  };
}

const styles = StyleSheet.create({
  stateScreen: { flexGrow: 1, justifyContent: 'center' },
  stateText: { ...textStyle('body'), color: colors.ink62, textAlign: 'center' },
  submitError: {
    ...textStyle('caption'),
    color: colors.attention,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
