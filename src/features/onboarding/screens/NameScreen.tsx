import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { VoiceInputBar } from '@/shared/components/VoiceInputBar';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { flowStepProgress, flowStepRoute, nextFlowStep } from '@/features/onboarding/lib/steps';

/** Name — first step of the whole interview (onboarding-v2-flow-plan.md §1 row 2). Design source:
 * designs/reference/screens-source.html `data-screen-label="7a·1 Name"`. */
export default function NameScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const completeStep = useOnboardingStore((state) => state.completeStep);
  const [name, setName] = useState(draft.name);

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextDraft = { ...draft, name: trimmed };
    update({ name: trimmed });
    completeStep('name');
    const next = nextFlowStep('name', nextDraft);
    if (next) router.push(flowStepRoute(next));
  };

  return (
    <OnboardingStepScaffold
      progress={flowStepProgress('name', draft)}
      title={
        <Text style={onboardingTitleStyles.base}>
          What should I <Text style={onboardingTitleStyles.emphasis}>call you?</Text>
        </Text>
      }
      footer={
        <VoiceInputBar
          value={name}
          onChangeText={setName}
          placeholder="Type your name"
          onSubmit={confirm}
          submitDisabled={name.trim().length === 0}
          autoFocus
        />
      }
    />
  );
}
