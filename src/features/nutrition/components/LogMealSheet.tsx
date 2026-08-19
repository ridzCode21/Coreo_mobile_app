import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { VoiceInputBar } from '@/shared/components/VoiceInputBar';
import { ApiError } from '@/shared/api/errors';
import { colors, radii, spacing, textStyle } from '@/shared/theme/tokens';
import { LoggingOptionTile } from '@/features/nutrition/components/LoggingOptionTile';
import { FoodSearchList } from '@/features/nutrition/components/FoodSearchList';
import { useAnalyzePhotoMutation } from '@/features/nutrition/api/nutritionApi';
import {
  captureMealPhotoFromCamera,
  pickMealPhotoFromLibrary,
} from '@/features/nutrition/lib/photoCapture';
import { scalePer100g } from '@/features/nutrition/lib/macros';
import type { ConfirmPrefill } from '@/features/nutrition/schemas';
import type { FoodItem, FoodSource } from '@/shared/types/food';

type LogMealSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const ICON_SIZE = 24;
const iconStroke = colors.ink;
const iconStrokeOnNight = colors.onNight;

function CameraIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.2-1.8A1 1 0 0 1 8.5 5h7a1 1 0 0 1 .8.4L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" stroke={stroke} strokeWidth={1.6} />
      <Circle cx={12} cy={13} r={3.2} stroke={stroke} strokeWidth={1.6} />
    </Svg>
  );
}
function BarcodeIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6v12M8 6v12M12 6v12M16 6v12M20 6v12" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
function LabelIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={3} width={14} height={18} rx={2} stroke={stroke} strokeWidth={1.6} />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
function DescribeIcon({ stroke }: { stroke: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v11H9l-4 3v-3H4z" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

/** Read the API's own error copy off an ApiError (photo 422/429 carry `{ error: "..." }`). */
function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.details as { error?: string } | undefined;
    if (body?.error) return body.error;
  }
  return fallback;
}

/**
 * "What are we logging?" sheet (14b) — the four logging paths plus the describe/search bar. Photo
 * (snap + nutrition label) is wired to §8 `/food/photo/`; barcode opens the live camera scanner
 * (`/nutrition/scan`, Layer 1.1). Each path degrades to manual entry on failure with the API's own
 * calm copy (design spec §10). Every successful capture/pick routes to the confirm screen — nothing
 * is committed without a look.
 */
export function LogMealSheet({ visible, onClose }: LogMealSheetProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [autoFocusInput, setAutoFocusInput] = useState(false);

  const analyze = useAnalyzePhotoMutation();

  const reset = () => {
    setQuery('');
    setNotice(null);
    setAutoFocusInput(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const goConfirm = (source: FoodSource, prefill?: ConfirmPrefill) => {
    close();
    router.push({
      pathname: '/nutrition/confirm',
      params: {
        source,
        ...(prefill ? { prefill: JSON.stringify(prefill) } : {}),
      },
    });
  };

  const openScanner = () => {
    close();
    router.push('/nutrition/scan');
  };

  const onPickSearchResult = (item: FoodItem) => {
    const scaled = scalePer100g(
      {
        calories: item.calories_per_100g,
        protein_g: item.protein_g_per_100g,
        carbs_g: item.carbs_g_per_100g,
        fat_g: item.fat_g_per_100g,
      },
      100,
    );
    goConfirm('manual', { food_name: item.name, ...scaled });
  };

  const onSubmitDescribe = () => {
    const typed = query.trim();
    if (typed.length === 0) return;
    // Manual free-text: prefill the name only; the confirm screen is where macros get set.
    goConfirm('manual', { food_name: typed });
  };

  const runPhoto = async () => {
    setNotice(null);
    const capture = await captureMealPhotoFromCamera();
    if (capture.status === 'permission_denied') {
      // Simulators have no camera — offer the library so the flow is still demoable.
      const fromLibrary = await pickMealPhotoFromLibrary();
      if (fromLibrary.status !== 'ok') {
        setNotice('I need camera access to read a plate. You can describe it instead.');
        return;
      }
      analyzeAndConfirm(fromLibrary.file);
      return;
    }
    if (capture.status === 'cancelled') return;
    analyzeAndConfirm(capture.file);
  };

  const analyzeAndConfirm = (file: { uri: string; name: string; type: string }) => {
    analyze.mutate(file, {
      onSuccess: (estimate) =>
        goConfirm('photo', {
          food_name: estimate.name,
          calories: estimate.est_calories,
          protein_g: estimate.est_protein_g,
          carbs_g: estimate.est_carbs_g,
          fat_g: estimate.est_fat_g,
        }),
      onError: (error) =>
        setNotice(apiMessage(error, "I couldn't read that one. Describe it and I'll do the math.")),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <Text style={styles.title}>What are we logging?</Text>
          <Text style={styles.subtitle}>However it comes. I do the math.</Text>

          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <LoggingOptionTile
                title="Snap the plate"
                subtitle="I read the whole meal"
                icon={<CameraIcon stroke={iconStrokeOnNight} />}
                emphasized
                onPress={runPhoto}
              />
              <LoggingOptionTile
                title="Scan barcode"
                subtitle="Packaged anything"
                icon={<BarcodeIcon stroke={iconStroke} />}
                onPress={openScanner}
              />
            </View>
            <View style={styles.gridRow}>
              <LoggingOptionTile
                title="Nutrition label"
                subtitle="I digitize the fine print"
                icon={<LabelIcon stroke={iconStroke} />}
                onPress={runPhoto}
              />
              <LoggingOptionTile
                title="Describe it"
                subtitle="Type or talk it out"
                icon={<DescribeIcon stroke={iconStroke} />}
                onPress={() => setAutoFocusInput(true)}
              />
            </View>
          </View>

          {analyze.isPending ? (
            <View style={styles.pendingRow}>
              <ActivityIndicator color={colors.ink40} />
              <Text style={styles.pendingText}>Reading your plate…</Text>
            </View>
          ) : null}

          <FoodSearchList query={query} onPick={onPickSearchResult} />

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <VoiceInputBar
            value={query}
            onChangeText={setQuery}
            placeholder={'"Two rotis, dal, and a lassi"'}
            onSubmit={onSubmitDescribe}
            submitDisabled={query.trim().length === 0}
            autoFocus={autoFocusInput}
            style={styles.inputBar}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18,42,70,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.zenith,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.ink40,
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyle('sheetTitle'),
    color: colors.ink,
  },
  subtitle: {
    ...textStyle('body'),
    color: colors.ink45,
  },
  grid: {
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    ...textStyle('bodySm'),
    color: colors.ink45,
  },
  notice: {
    ...textStyle('bodySm'),
    color: colors.attention,
  },
  inputBar: {
    marginTop: spacing.xs,
  },
});
