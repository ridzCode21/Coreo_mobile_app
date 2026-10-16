import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useAssistantConfirmMutation,
  useAssistantMutation,
} from '@/features/nutrition/api/mealPlanApi';
import {
  colors,
  componentSizes,
  radii,
  spacing,
  textStyle,
  withAlpha,
} from '@/shared/theme/tokens';
import type { AssistantProposal, RecipeJson } from '@/shared/types/mealPlan';

type PlanAssistantFlowProps = {
  date: string;
  promptId: number;
  onClose: () => void;
};

export function PlanAssistantFlow({ date, promptId, onClose }: PlanAssistantFlowProps) {
  const assistant = useAssistantMutation(date);
  const confirmAssistant = useAssistantConfirmMutation(date);
  const requestedPrompt = useRef<number | null>(null);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [recipe, setRecipe] = useState<RecipeJson | null>(null);

  useEffect(() => {
    if (requestedPrompt.current === promptId) return;
    requestedPrompt.current = promptId;
    assistant.mutate(promptId, {
      onSuccess: (response) => {
        if ('recipe' in response) {
          setRecipe(response.recipe);
          return;
        }
        setProposal(response);
      },
    });
  }, [assistant, promptId]);

  const close = () => {
    setProposal(null);
    setRecipe(null);
    onClose();
  };

  return (
    <>
      {assistant.isPending && !proposal && !recipe ? (
        <ActivityIndicator color={colors.ink45} accessibilityLabel="Loading quick action" />
      ) : null}
      <RecipeSheet recipe={recipe} onClose={close} />
      <ProposalSheet
        proposal={proposal}
        saving={confirmAssistant.isPending}
        onClose={close}
        onConfirm={() => {
          if (!proposal) return;
          confirmAssistant.mutate(proposal.proposal_id, { onSuccess: close });
        }}
      />
    </>
  );
}

function RecipeSheet({ recipe, onClose }: { recipe: RecipeJson | null; onClose: () => void }) {
  return (
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close recipe"
      />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{recipe?.name}</Text>
          {recipe?.steps.map((step) => (
            <Text key={step.step} style={styles.sheetBody}>
              {step.step}. {step.instruction}
            </Text>
          ))}
          <Pressable
            onPress={onClose}
            style={styles.sheetPrimary}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.sheetPrimaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ProposalSheet({
  proposal,
  saving,
  onClose,
  onConfirm,
}: {
  proposal: AssistantProposal | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={proposal !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close suggestion"
      />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetLabel}>Coreo suggests</Text>
          <Text style={styles.sheetTitle}>{proposal?.summary}</Text>
          <View style={styles.sheetButtonRow}>
            <Pressable
              onPress={onClose}
              style={styles.sheetSecondary}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              <Text style={styles.sheetSecondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              style={styles.sheetPrimaryHalf}
              accessibilityRole="button"
              accessibilityLabel="Confirm"
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.sheetPrimaryText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(colors.overlayInk, 0.35),
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.zenith,
    borderTopLeftRadius: radii.quotaCard,
    borderTopRightRadius: radii.quotaCard,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  grabber: {
    alignSelf: 'center',
    width: componentSizes.sheetGrabberWidth,
    height: componentSizes.sheetGrabberHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink40,
    marginBottom: spacing.lg,
  },
  sheetLabel: { ...textStyle('label'), color: colors.ink45 },
  sheetTitle: { ...textStyle('sheetTitle'), color: colors.ink, marginTop: spacing.sm },
  sheetBody: { ...textStyle('body'), color: colors.ink62, marginTop: spacing.md },
  sheetPrimary: {
    minHeight: componentSizes.authButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  sheetPrimaryText: { ...textStyle('body'), color: colors.white },
  sheetButtonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  sheetSecondary: {
    flex: 1,
    minHeight: componentSizes.authButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.white, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryHalf: {
    flex: 1,
    minHeight: componentSizes.authButtonHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecondaryText: { ...textStyle('body'), color: colors.ink62 },
});
