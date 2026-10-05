import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SelectableChip } from '@/shared/components/SelectableChip';
import { SliderRow } from '@/shared/components/SliderRow';
import { VoiceInputBar } from '@/shared/components/VoiceInputBar';
import { colors, spacing, textStyle } from '@/shared/theme/tokens';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { NextBar } from '@/features/onboarding/components/NextBar';
import {
  DIET_QUESTIONS,
  dietQuestionTitle,
  getDietQuestion,
  isDietQuestionAnswered,
  type DietQuestion,
} from '@/features/onboarding/lib/dietQuestions';
import {
  flowStepProgress,
  flowStepRoute,
  nextFlowStep,
  type FlowStepId,
} from '@/features/onboarding/lib/steps';
import { freeFoodEntrySchema } from '@/features/onboarding/schemas';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';

/**
 * The one generic renderer for the whole nutrition interview (onboarding-v2-flow-plan.md §1/§2):
 * every question in `dietQuestions.ts` — single-choice, multi-choice, the target-weight slider,
 * and the mock-only weak-moment screen — flows through this component. Adding/reordering/removing
 * a question is a `dietQuestions.ts` + `steps.ts` edit only; this file never needs to change.
 *
 * v2 no longer PUTs an answer to the server per question — the whole interview runs *before*
 * signup now (no session to authenticate a PUT with), so every answer only ever writes to the
 * local `onboardingStore` draft. The entire draft is committed in one `PUT /users/me/diet-profile/`
 * at "Save your core", after register succeeds (see `SaveScreen`).
 */
export default function DietQuestionScreen() {
  const router = useRouter();
  const { step } = useLocalSearchParams<{ step: string }>();
  const question = getDietQuestion(step ?? '') ?? DIET_QUESTIONS[0];
  const stepId = question.id as FlowStepId;

  const draft = useOnboardingStore((state) => state.draft);
  const updateDietProfile = useOnboardingStore((state) => state.updateDietProfile);
  const toggleDietListValue = useOnboardingStore((state) => state.toggleDietListValue);
  const toggleWeakMoment = useOnboardingStore((state) => state.toggleWeakMoment);
  const completeStep = useOnboardingStore((state) => state.completeStep);

  const [freeText, setFreeText] = useState('');
  const [freeTextError, setFreeTextError] = useState<string | null>(null);

  const answered = isDietQuestionAnswered(question, draft.dietProfile);

  // Slider questions render a fallback default (`target_weight_kg ?? weightKg` in
  // `DietQuestionBody`) so the screen never looks unanswered — but `isDietQuestionAnswered`
  // treats *all* slider questions as answered unconditionally (Next is never blocked on them),
  // so a user who taps Next without dragging leaves the field genuinely `null` forever. That
  // silently broke `dietProfileCompletenessDetail` (Calibrating requires `target_weight_kg !==
  // null`), which then bounced them back to this exact screen every time — an unintentional
  // dead loop. Fix: commit the same default actually shown on screen into the draft as soon as
  // it renders, so "looks answered" and "is answered" can never disagree again.
  useEffect(() => {
    if (question.kind === 'slider' && draft.dietProfile[question.field] === null) {
      updateDietProfile({ [question.field]: Math.round(draft.weightKg) });
    }
    // Re-run only when the slider question itself changes, not on every draft mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const goNext = () => {
    completeStep(stepId);
    const next = nextFlowStep(stepId, draft);
    if (!next) return;
    router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress(stepId, draft)}
      compactPaddingX
      title={
        <Text style={onboardingTitleStyles.compact}>
          {dietQuestionTitle(question, draft.name)}
          {question.titleEmphasis ? (
            <Text style={onboardingTitleStyles.emphasis}> {question.titleEmphasis}</Text>
          ) : null}
        </Text>
      }
      subtitle={question.subtitle}
      footer={
        <NextBar label={question.footerLabel ?? 'Next'} onPress={goNext} disabled={!answered} />
      }
    >
      <DietQuestionBody
        question={question}
        draft={draft}
        onSelectSingle={(value) => {
          if (question.kind !== 'single') return;
          const parsed = question.parseValue ? question.parseValue(value) : value;
          updateDietProfile({ [question.field]: parsed } as never);
        }}
        onToggleMulti={(value) => {
          if (question.kind !== 'multi') return;
          const current = draft.dietProfile[question.field] as string[];
          const atMax =
            Boolean(question.maxSelections) &&
            current.length >= (question.maxSelections ?? Infinity);
          if (atMax && !current.includes(value)) return;
          toggleDietListValue(question.field, value);
        }}
        onSlide={(value) => updateDietProfile({ target_weight_kg: value })}
        onToggleMock={(value) => toggleWeakMoment(value)}
        freeText={freeText}
        onFreeTextChange={setFreeText}
        freeTextError={freeTextError}
        onFreeAdd={() => {
          if (question.kind !== 'multi' || !question.freeAddField) return;
          const parsed = freeFoodEntrySchema.safeParse(freeText);
          if (!parsed.success) {
            setFreeTextError(parsed.error.issues[0]?.message ?? 'Type something first');
            return;
          }
          setFreeTextError(null);
          toggleDietListValue(question.freeAddField, parsed.data.toLowerCase());
          setFreeText('');
        }}
        onRemoveFree={(value) => {
          if (question.kind !== 'multi' || !question.freeAddField) return;
          toggleDietListValue(question.freeAddField, value);
        }}
      />
    </OnboardingStepScaffold>
  );
}

type DietQuestionBodyProps = {
  question: DietQuestion;
  draft: ReturnType<typeof useOnboardingStore.getState>['draft'];
  onSelectSingle: (value: string) => void;
  onToggleMulti: (value: string) => void;
  onSlide: (value: number) => void;
  onToggleMock: (value: string) => void;
  freeText: string;
  onFreeTextChange: (text: string) => void;
  freeTextError: string | null;
  onFreeAdd: () => void;
  onRemoveFree: (value: string) => void;
};

function DietQuestionBody({
  question,
  draft,
  onSelectSingle,
  onToggleMulti,
  onSlide,
  onToggleMock,
  freeText,
  onFreeTextChange,
  freeTextError,
  onFreeAdd,
  onRemoveFree,
}: DietQuestionBodyProps) {
  if (question.kind === 'single') {
    const current = draft.dietProfile[question.field];
    return (
      <View style={styles.chipGrid}>
        {question.options.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            selected={String(current) === option.value}
            onPress={() => onSelectSingle(option.value)}
          />
        ))}
      </View>
    );
  }

  if (question.kind === 'multi') {
    const selectedList = draft.dietProfile[question.field] as string[];
    const freeList = question.freeAddField ? draft.dietProfile[question.freeAddField] : [];
    return (
      <View style={styles.stack}>
        <View style={styles.chipGrid}>
          {question.options.map((option) => (
            <SelectableChip
              key={option.value}
              label={option.label}
              selected={selectedList.includes(option.value)}
              onPress={() => onToggleMulti(option.value)}
            />
          ))}
        </View>
        {question.freeAddField ? (
          <>
            {freeList.length > 0 ? (
              <View style={styles.chipGrid}>
                {freeList.map((entry) => (
                  <SelectableChip
                    key={entry}
                    label={entry}
                    selected
                    onPress={() => onRemoveFree(entry)}
                  />
                ))}
              </View>
            ) : null}
            <VoiceInputBar
              value={freeText}
              onChangeText={onFreeTextChange}
              placeholder={question.freeAddPlaceholder ?? 'Or just tell me'}
              onSubmit={onFreeAdd}
            />
            {freeTextError ? <Text style={styles.fieldError}>{freeTextError}</Text> : null}
          </>
        ) : null}
      </View>
    );
  }

  if (question.kind === 'slider') {
    const value = draft.dietProfile.target_weight_kg ?? draft.weightKg;
    return (
      <SliderRow
        label={`You're at ${Math.round(draft.weightKg)} kg`}
        value={Math.round(value)}
        min={Math.max(30, Math.round(draft.weightKg + question.minOffset))}
        max={Math.round(draft.weightKg + question.maxOffset)}
        unit={question.unit}
        onChange={onSlide}
      />
    );
  }

  // mockOnly (D10 weak moment) — draft-only, never sent to the API (F3).
  return (
    <View style={styles.chipGrid}>
      {question.options.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          selected={draft.weakMoments.includes(option.value)}
          onPress={() => onToggleMock(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  fieldError: {
    ...textStyle('caption'),
    color: colors.attention,
    marginTop: spacing.xs,
  },
});
