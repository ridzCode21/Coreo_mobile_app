import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';

import { VoiceInputBar } from '@/shared/components/VoiceInputBar';
import {
  OnboardingStepScaffold,
  onboardingTitleStyles,
} from '@/features/onboarding/components/OnboardingStepScaffold';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { getNextOnboardingStep, onboardingStepRoute } from '@/features/onboarding/lib/steps';

/** 7a·1 Name — designs/reference/screens-source.html `data-screen-label="7a·1 Name"`. */
export default function NameScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const update = useOnboardingStore((state) => state.update);
  const [name, setName] = useState(draft.name);

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update({ name: trimmed });
    router.push(onboardingStepRoute(getNextOnboardingStep('name', { ...draft, name: trimmed })));
  };

  return (
    <OnboardingStepScaffold
      step="name"
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
