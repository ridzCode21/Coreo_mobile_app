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

import {
  useUpdateWellnessProfileMutation,
  useWellnessProfileQuery,
} from '@/features/wellness/api/wellnessProfileApi';
import { CheckInStep } from '@/features/wellness/components/steps/CheckInStep';
import { FocusStep } from '@/features/wellness/components/steps/FocusStep';
import { HelpsStep } from '@/features/wellness/components/steps/HelpsStep';
import { MorningStep } from '@/features/wellness/components/steps/MorningStep';
import { NightsStep } from '@/features/wellness/components/steps/NightsStep';
import { NextBar, OnboardingStepScaffold, onboardingTitleStyles } from '@/features/onboarding';
import { Screen } from '@/shared/components/Screen';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import type {
  CheckInStyle,
  MorningFirst,
  WellnessFocus,
  WellnessProfile,
  WellnessProfilePatch,
  WhatHelps,
} from '@/shared/types/wellnessProfile';

const WELLNESS_ROUTE = '/wellness' as Href;

type InterviewAnswers = Pick<
  WellnessProfile,
  | 'wellness_focus'
  | 'nights_note'
  | 'morning_first'
  | 'what_helps'
  | 'check_in_style'
  | 'hide_numbers'
>;

const EMPTY_ANSWERS: InterviewAnswers = {
  wellness_focus: '',
  nights_note: '',
  morning_first: '',
  what_helps: [],
  check_in_style: '',
  hide_numbers: false,
};

export default function WellnessInterviewScreen() {
  const router = useRouter();
  const profileQuery = useWellnessProfileQuery();
  const updateProfile = useUpdateWellnessProfileMutation();
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
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading wellness interview" />
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

  const submit = (patch: WellnessProfilePatch) => {
    updateProfile.mutate(patch, {
      onSuccess: () => {
        if (step === 4) router.replace(WELLNESS_ROUTE);
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

function answersFromProfile(profile: WellnessProfile): InterviewAnswers {
  return {
    wellness_focus: profile.wellness_focus,
    nights_note: profile.nights_note,
    morning_first: profile.morning_first,
    what_helps: [...profile.what_helps],
    check_in_style: profile.check_in_style,
    hide_numbers: profile.hide_numbers,
  };
}

type StepConfig = {
  title: ReactNode;
  body: ReactNode;
  footerLabel: string;
  canAdvance: boolean;
  patch: WellnessProfilePatch;
};

function getStepConfig(
  step: number,
  answers: InterviewAnswers,
  setAnswers: Dispatch<SetStateAction<InterviewAnswers>>,
): StepConfig {
  if (step === 0) {
    return {
      title: 'What weighs on you most, right now? One thing. We start there.',
      body: (
        <FocusStep
          value={answers.wellness_focus}
          onChange={(wellness_focus: WellnessFocus) =>
            setAnswers((current) => ({ ...current, wellness_focus }))
          }
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.wellness_focus !== '',
      patch: { wellness_focus: answers.wellness_focus },
    };
  }

  if (step === 1) {
    return {
      title: "Tell me about your nights. When you're in bed, what actually happens?",
      body: (
        <NightsStep
          value={answers.nights_note}
          onChange={(nights_note: string) => setAnswers((current) => ({ ...current, nights_note }))}
        />
      ),
      footerLabel: "Keep going. I've got it",
      canAdvance: true,
      patch: { nights_note: answers.nights_note.trim() },
    };
  }

  if (step === 2) {
    return {
      title: "Before anything else. What's the first thing you do when you wake up?",
      body: (
        <MorningStep
          value={answers.morning_first}
          onChange={(morning_first: MorningFirst) =>
            setAnswers((current) => ({ ...current, morning_first }))
          }
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.morning_first !== '',
      patch: { morning_first: answers.morning_first },
    };
  }

  if (step === 3) {
    return {
      title:
        "What already helps, even a little? I build on what's yours before adding anything new.",
      body: (
        <HelpsStep
          value={answers.what_helps}
          onChange={(what_helps: WhatHelps[]) =>
            setAnswers((current) => ({ ...current, what_helps }))
          }
        />
      ),
      footerLabel: 'Next',
      canAdvance: answers.what_helps.length > 0,
      patch: { what_helps: answers.what_helps },
    };
  }

  return {
    title: 'Last one. How should check-ins work?',
    body: (
      <CheckInStep
        checkInStyle={answers.check_in_style}
        hideNumbers={answers.hide_numbers}
        onCheckInStyleChange={(check_in_style: CheckInStyle) =>
          setAnswers((current) => ({ ...current, check_in_style }))
        }
        onHideNumbersChange={(hide_numbers: boolean) =>
          setAnswers((current) => ({ ...current, hide_numbers }))
        }
      />
    ),
    footerLabel: 'Build my evenings',
    canAdvance: answers.check_in_style !== '',
    patch: { check_in_style: answers.check_in_style, hide_numbers: answers.hide_numbers },
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
